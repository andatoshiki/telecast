import type { StaticSnapshot } from '../src/lib/telegram/static-snapshot'
import type { ChannelInfo } from '../src/lib/types'
import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as cheerio from 'cheerio'
import lunr from 'lunr'
import sharp from 'sharp'
import { SITE_CONSTANTS } from '../src/lib/constant'
import { buildPostSearchDataset } from '../src/lib/search/search-documents'
import {
  buildRemoteStaticSnapshot,
  writeGeneratedStaticSnapshot,
} from '../src/lib/telegram/static-snapshot'
import { generateOgImageFromChannel } from './generate-og-image'

const SEARCH_INDEX_OUTPUT_PATH = path.resolve(process.cwd(), 'public/search/index.json')

function normalizeMediaDirectory(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return '/media'
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')) {
    return withLeadingSlash.slice(0, -1)
  }

  return withLeadingSlash
}

const MEDIA_DIRECTORY = normalizeMediaDirectory(SITE_CONSTANTS.mediaMirror.directory)
const MEDIA_OUTPUT_DIR = path.resolve(process.cwd(), `public${MEDIA_DIRECTORY}`)
const MEDIA_URL_PREFIX = `${MEDIA_DIRECTORY}/`
const CLOUDFLARE_IMAGE_MARKER = '/cdn-cgi/image/'
const CLOUDFLARE_CONFIG = SITE_CONSTANTS.cloudFlare

const SUPPORTED_MEDIA_ATTRIBUTES: Array<[selector: string, attribute: string]> = [
  ['img[src]', 'src'],
  ['img[srcset]', 'srcset'],
  ['video[src]', 'src'],
  ['video[poster]', 'poster'],
  ['source[src]', 'src'],
]

const CONTENT_TYPE_EXTENSIONS = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/jpg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
  ['image/svg+xml', '.svg'],
  ['video/mp4', '.mp4'],
  ['video/webm', '.webm'],
  ['video/quicktime', '.mov'],
])

const URL_IN_STYLE_PATTERN = /url\((['"]?)(.*?)\1\)/gi

interface LocalMirrorStats {
  provider: 'local'
  resolvedCount: number
  downloadedCount: number
}

type MirrorStats = LocalMirrorStats

interface BuildMediaMirrorOptions {
  onResolved?: () => void
}

interface MirrorProgressTracker {
  tick: () => void
  finish: () => void
}

function hasHttpProtocol(value: string) {
  return /^https?:\/\//i.test(value)
}

function fileExists(filePath: string) {
  return access(filePath).then(() => true).catch(() => false)
}

function normalizeProxyLikeUrl(input: string) {
  let next = input.trim()
  if (!next) {
    return ''
  }

  if (next.startsWith('/static/')) {
    next = next.slice('/static/'.length)
  }

  try {
    next = decodeURIComponent(next)
  }
  catch {
    // Keep original value if decoding fails.
  }

  if (/^https?:\/(?!\/)/i.test(next)) {
    next = next.replace(/^([a-z]+:)\/(?!\/)/i, '$1//')
  }

  if (next.startsWith('//')) {
    next = `https:${next}`
  }

  return next
}

function normalizeRemoteMediaUrl(input: string) {
  const normalized = normalizeProxyLikeUrl(input)
  if (!normalized) {
    return ''
  }

  if (normalized.startsWith(MEDIA_URL_PREFIX)) {
    return normalized
  }

  if (normalized.startsWith('/')) {
    try {
      const relativeResolved = new URL(normalized, `https://${SITE_CONSTANTS.telegramHost}`)
      return relativeResolved.toString()
    }
    catch {
      return ''
    }
  }

  if (!hasHttpProtocol(normalized)) {
    return ''
  }

  try {
    const url = new URL(normalized)
    return url.toString()
  }
  catch {
    return ''
  }
}

function normalizeCloudflareTransformPrefix(input: string) {
  const normalized = input.trim()
  if (!normalized) {
    return '/cdn-cgi/image/format=auto'
  }

  return normalized.endsWith('/')
    ? normalized.slice(0, -1)
    : normalized
}

function isCloudflareTransformEnabled() {
  if (!CLOUDFLARE_CONFIG.transform) {
    return false
  }

  const forceValue = (process.env.TELECAST_FORCE_CLOUDFLARE_TRANSFORM || '').trim().toLowerCase()
  if (forceValue === '1' || forceValue === 'true' || forceValue === 'yes') {
    return true
  }

  if (process.env.NODE_ENV === 'production') {
    return true
  }

  if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
    return true
  }

  return false
}

function applyCloudflareImageTransform(rawValue: string) {
  const input = rawValue.trim()
  if (!input || !isCloudflareTransformEnabled()) {
    return rawValue
  }

  if (input.includes(CLOUDFLARE_IMAGE_MARKER)) {
    return input
  }

  const prefix = normalizeCloudflareTransformPrefix(CLOUDFLARE_CONFIG.transformPrefix)

  if (input.startsWith(MEDIA_URL_PREFIX)) {
    return `${prefix}${input}`
  }

  try {
    const parsed = new URL(input)
    if (!parsed.pathname.startsWith(MEDIA_URL_PREFIX)) {
      return input
    }
    return `${prefix}${parsed.pathname}${parsed.search}${parsed.hash}`
  }
  catch {
    return input
  }
}

function shouldApplyTransformOnHtmlAttribute(selector: string, attribute: string) {
  if (selector.startsWith('img[') && (attribute === 'src' || attribute === 'srcset')) {
    return true
  }

  if (selector === 'video[poster]' && attribute === 'poster') {
    return true
  }

  return false
}

function normalizeFileExtensionFromPathname(pathname: string) {
  const ext = path.extname(pathname).toLowerCase()
  if (!ext || ext.length > 8 || !/^\.[a-z0-9]+$/i.test(ext)) {
    return ''
  }
  return ext
}

function getFileExtension(sourceUrl: string, contentType: string) {
  try {
    const extFromPath = normalizeFileExtensionFromPathname(new URL(sourceUrl).pathname)
    if (extFromPath) {
      return extFromPath
    }
  }
  catch {
    // Ignore URL parse errors and fallback to content type.
  }

  const normalizedContentType = contentType.split(';')[0]?.trim().toLowerCase()
  return CONTENT_TYPE_EXTENSIONS.get(normalizedContentType) || '.bin'
}

function createMediaFileName(sourceUrl: string, extension: string) {
  const digest = crypto.createHash('sha256').update(sourceUrl).digest('hex')
  return `${digest.slice(0, 32)}${extension}`
}

function parseSrcsetEntries(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map((entry) => {
      const [url, ...descriptorParts] = entry.split(/\s+/)
      return {
        url,
        descriptor: descriptorParts.join(' '),
      }
    })
}

function mergeSrcsetEntries(entries: Array<{ url: string, descriptor: string }>) {
  return entries
    .map(({ url, descriptor }) => descriptor ? `${url} ${descriptor}` : url)
    .join(', ')
}

function collectStyleUrls(styleValue: string) {
  const urls: string[] = []
  URL_IN_STYLE_PATTERN.lastIndex = 0
  let match = URL_IN_STYLE_PATTERN.exec(styleValue)
  while (match !== null) {
    const value = match[2]?.trim() || ''
    if (value) {
      urls.push(value)
    }
    match = URL_IN_STYLE_PATTERN.exec(styleValue)
  }
  return urls
}

function collectHtmlMediaCandidates(html: string) {
  if (!html) {
    return []
  }

  const $ = cheerio.load(`<div id=\"root\">${html}</div>`, {}, false)
  const root = $('#root')
  const urls: string[] = []

  for (const [selector, attribute] of SUPPORTED_MEDIA_ATTRIBUTES) {
    const nodes = root.find(selector).toArray()

    for (const node of nodes) {
      const element = $(node)
      const currentValue = element.attr(attribute)?.trim()
      if (!currentValue) {
        continue
      }

      if (attribute === 'srcset') {
        const entries = parseSrcsetEntries(currentValue)
        for (const entry of entries) {
          urls.push(entry.url)
        }
        continue
      }

      urls.push(currentValue)
    }
  }

  const styleNodes = root.find('[style*="url("]').toArray()
  for (const node of styleNodes) {
    const element = $(node)
    const styleValue = element.attr('style') || ''
    if (!styleValue) {
      continue
    }

    urls.push(...collectStyleUrls(styleValue))
  }

  return urls
}

function trackMirrorCandidate(rawValue: string, candidates: Set<string>) {
  const normalizedUrl = normalizeRemoteMediaUrl(rawValue)
  if (!normalizedUrl || normalizedUrl.startsWith(MEDIA_URL_PREFIX)) {
    return
  }

  candidates.add(normalizedUrl)
}

function countSnapshotMediaCandidates(snapshot: StaticSnapshot) {
  const candidates = new Set<string>()
  const channels: ChannelInfo[] = [snapshot.root, ...snapshot.pages.map(page => page.channel)]

  for (const channel of channels) {
    if (channel.avatar) {
      trackMirrorCandidate(channel.avatar, candidates)
    }

    for (const candidate of collectHtmlMediaCandidates(channel.descriptionHTML || '')) {
      trackMirrorCandidate(candidate, candidates)
    }

    for (const post of channel.posts) {
      for (const candidate of collectHtmlMediaCandidates(post.content || '')) {
        trackMirrorCandidate(candidate, candidates)
      }

      for (const reaction of post.reactions) {
        if (reaction.emojiImage) {
          trackMirrorCandidate(reaction.emojiImage, candidates)
        }
      }
    }
  }

  return candidates.size
}

function formatMirrorProgressBar(completed: number, total: number, width = 28) {
  const safeTotal = Math.max(total, 1)
  const ratio = Math.min(1, completed / safeTotal)
  const filled = Math.round(width * ratio)
  const empty = Math.max(0, width - filled)
  const percent = Math.round(ratio * 100)
  return `[${'='.repeat(filled)}${'-'.repeat(empty)}] ${percent}% (${completed}/${total})`
}

function createMirrorProgressTracker(total: number): MirrorProgressTracker {
  if (total <= 0) {
    return {
      tick() {},
      finish() {},
    }
  }

  let completed = 0
  let closed = false
  let lastLoggedPercent = 0
  const isTty = Boolean(process.stdout.isTTY)

  const getLine = () => `[telecast] mirroring media ${formatMirrorProgressBar(completed, total)}`

  const writeLine = (newline = false) => {
    if (isTty) {
      process.stdout.write(`\x1b[2K\r${getLine()}${newline ? '\n' : ''}`)
    }
    else {
      const percent = Math.round((completed / Math.max(total, 1)) * 100)
      if (percent - lastLoggedPercent >= 10 || completed === total || completed === 0) {
        lastLoggedPercent = percent
        console.info(getLine())
      }
    }
  }

  writeLine()

  return {
    tick() {
      if (closed) {
        return
      }

      completed = Math.min(total, completed + 1)
      writeLine()
    },
    finish() {
      if (closed) {
        return
      }

      closed = true
      completed = total
      writeLine(true)
    },
  }
}

async function buildMediaMirror(options: BuildMediaMirrorOptions = {}) {
  await mkdir(MEDIA_OUTPUT_DIR, { recursive: true })

  const replacementCache = new Map<string, Promise<string>>()
  let downloadedCount = 0

  async function mirrorUrl(rawValue: string) {
    const normalizedUrl = normalizeRemoteMediaUrl(rawValue)
    if (!normalizedUrl) {
      return rawValue
    }

    if (normalizedUrl.startsWith(MEDIA_URL_PREFIX)) {
      return normalizedUrl
    }

    const cachedPromise = replacementCache.get(normalizedUrl)
    if (cachedPromise) {
      return cachedPromise
    }

    const pending = (async () => {
      try {
        const initialExtension = getFileExtension(normalizedUrl, '')
        let fileName = createMediaFileName(normalizedUrl, initialExtension)
        let outputPath = path.join(MEDIA_OUTPUT_DIR, fileName)

        if (await fileExists(outputPath)) {
          return `${MEDIA_DIRECTORY}/${fileName}`
        }

        const response = await fetch(normalizedUrl, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'user-agent': SITE_CONSTANTS.mediaMirror.userAgent,
            'accept': '*/*',
          },
        })

        if (!response.ok) {
          return rawValue
        }

        const contentType = response.headers.get('content-type') || ''
        const resolvedExtension = getFileExtension(normalizedUrl, contentType)
        if (resolvedExtension !== initialExtension) {
          fileName = createMediaFileName(normalizedUrl, resolvedExtension)
          outputPath = path.join(MEDIA_OUTPUT_DIR, fileName)
        }

        if (await fileExists(outputPath)) {
          return `${MEDIA_DIRECTORY}/${fileName}`
        }

        const bytes = await response.arrayBuffer()
        if (bytes.byteLength === 0) {
          return rawValue
        }

        await writeFile(outputPath, Buffer.from(bytes))
        downloadedCount += 1
        return `${MEDIA_DIRECTORY}/${fileName}`
      }
      catch {
        return rawValue
      }
      finally {
        options.onResolved?.()
      }
    })()

    replacementCache.set(normalizedUrl, pending)
    return pending
  }

  return {
    mirrorUrl,
    getStats: () => ({ provider: 'local' as const, downloadedCount, resolvedCount: replacementCache.size }),
  }
}

async function rewriteHtmlMediaUrls(html: string, mirrorUrl: (value: string) => Promise<string>) {
  if (!html) {
    return html
  }

  const $ = cheerio.load(`<div id=\"root\">${html}</div>`, {}, false)
  const root = $('#root')

  for (const [selector, attribute] of SUPPORTED_MEDIA_ATTRIBUTES) {
    const nodes = root.find(selector).toArray()

    for (const node of nodes) {
      const element = $(node)
      const currentValue = element.attr(attribute)?.trim()
      if (!currentValue) {
        continue
      }

      if (attribute === 'srcset') {
        const entries = parseSrcsetEntries(currentValue)
        const shouldTransform = shouldApplyTransformOnHtmlAttribute(selector, attribute)
        const rewrittenEntries = await Promise.all(entries.map(async (entry) => {
          const mirrored = await mirrorUrl(entry.url)
          return {
            ...entry,
            url: shouldTransform ? applyCloudflareImageTransform(mirrored) : mirrored,
          }
        }))
        element.attr(attribute, mergeSrcsetEntries(rewrittenEntries))
        continue
      }

      const mirrored = await mirrorUrl(currentValue)
      const finalValue = shouldApplyTransformOnHtmlAttribute(selector, attribute)
        ? applyCloudflareImageTransform(mirrored)
        : mirrored
      element.attr(attribute, finalValue)
    }
  }

  const styleNodes = root.find('[style*="url("]').toArray()
  for (const node of styleNodes) {
    const element = $(node)
    let styleValue = element.attr('style') || ''
    if (!styleValue) {
      continue
    }

    const urls = collectStyleUrls(styleValue)
    for (const candidateUrl of urls) {
      const rewrittenUrl = applyCloudflareImageTransform(await mirrorUrl(candidateUrl))
      styleValue = styleValue.replace(candidateUrl, rewrittenUrl)
    }

    element.attr('style', styleValue)
  }

  return root.html() || ''
}

function cloneSnapshot(snapshot: StaticSnapshot): StaticSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as StaticSnapshot
}

async function mirrorSnapshotAssets(snapshot: StaticSnapshot) {
  const mirrored = cloneSnapshot(snapshot)
  const mediaCandidateCount = countSnapshotMediaCandidates(mirrored)
  const progress = createMirrorProgressTracker(mediaCandidateCount)
  const { mirrorUrl, getStats } = await buildMediaMirror({ onResolved: progress.tick })
  if (mediaCandidateCount === 0) {
    console.info('[telecast] no remote media assets detected for mirroring.')
  }

  try {
    const channels: ChannelInfo[] = [mirrored.root, ...mirrored.pages.map(page => page.channel)]

    for (const channel of channels) {
      if (channel.avatar) {
        channel.avatar = applyCloudflareImageTransform(await mirrorUrl(channel.avatar))
      }

      channel.descriptionHTML = await rewriteHtmlMediaUrls(channel.descriptionHTML || '', mirrorUrl)

      for (const post of channel.posts) {
        post.content = await rewriteHtmlMediaUrls(post.content || '', mirrorUrl)

        for (const reaction of post.reactions) {
          if (reaction.emojiImage) {
            reaction.emojiImage = applyCloudflareImageTransform(await mirrorUrl(reaction.emojiImage))
          }
        }
      }
    }

    return {
      snapshot: mirrored,
      stats: getStats() as MirrorStats,
    }
  }
  finally {
    progress.finish()
  }
}

async function writeStaticSearchIndex(snapshot: StaticSnapshot) {
  const posts = snapshot.pages.flatMap(page => page.channel.posts)
  const { documents } = buildPostSearchDataset(posts)

  const index = lunr(function buildIndex() {
    this.ref('id')
    this.field('title', { boost: 8 })
    this.field('text', { boost: 3 })
    this.field('tags', { boost: 14 })

    for (const doc of documents) {
      this.add(doc)
    }
  })

  const payload = {
    generatedAt: new Date().toISOString(),
    documents,
    index: index.toJSON(),
  }

  await mkdir(path.dirname(SEARCH_INDEX_OUTPUT_PATH), { recursive: true })
  await writeFile(SEARCH_INDEX_OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8')
}

function hasPosts(snapshot: StaticSnapshot | null | undefined) {
  if (!snapshot) {
    return false
  }

  return snapshot.postIds.length > 0
    || snapshot.pages.some(page => page.channel.posts.length > 0)
    || snapshot.root.posts.length > 0
}

async function run() {
  const shouldGenerateOgImage = process.argv.includes('--og-image')

  const remoteSnapshot = await buildRemoteStaticSnapshot()

  if (!hasPosts(remoteSnapshot)) {
    throw new Error('[telecast] remote snapshot has no posts sync aborted to avoid writing empty content')
  }

  const { snapshot: mirroredSnapshot, stats } = await mirrorSnapshotAssets(remoteSnapshot)

  await writeGeneratedStaticSnapshot(mirroredSnapshot)
  await writeStaticSearchIndex(mirroredSnapshot)

  console.info('[telecast] completed.')
  console.info(`[telecast] pages: ${mirroredSnapshot.pages.length}, posts: ${mirroredSnapshot.postIds.length}`)
  console.info(`[telecast] mirrored media urls: ${stats.resolvedCount}, new downloads: ${stats.downloadedCount}`)

  await generateImageMeta()

  if (shouldGenerateOgImage) {
    const ogResult = await generateOgImageFromChannel(mirroredSnapshot.root)
    console.info(`[telecast] og image: ${ogResult.relativePath}`)
  }
  else {
    console.info('[telecast] og image generation skipped pass --og-image to generate /og-auto.png')
  }
}

const IMAGE_META_PATH = path.join(MEDIA_OUTPUT_DIR, 'image-meta.json')
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'])
const BLUR_PLACEHOLDER_WIDTH = 20

interface ImageMeta {
  w: number
  h: number
  b: string // base64 data URI of tiny JPEG placeholder
}

async function generateImageMeta() {
  let existing: Record<string, ImageMeta> = {}
  try {
    const raw = await readFile(IMAGE_META_PATH, 'utf8')
    existing = JSON.parse(raw) as Record<string, ImageMeta>
  }
  catch {
    // First run or missing file — start fresh.
  }

  const files = await readdir(MEDIA_OUTPUT_DIR)
  const imageFiles = files.filter((f) => {
    const ext = path.extname(f).toLowerCase()
    return IMAGE_EXTENSIONS.has(ext)
  })

  let generated = 0
  const meta: Record<string, ImageMeta> = {}

  for (const file of imageFiles) {
    // Reuse existing entry if available.
    if (existing[file]) {
      meta[file] = existing[file]
      continue
    }

    try {
      const filePath = path.join(MEDIA_OUTPUT_DIR, file)
      const image = sharp(filePath)
      const { width, height } = await image.metadata()

      if (!width || !height) {
        continue
      }

      const placeholderBuffer = await image
        .resize(BLUR_PLACEHOLDER_WIDTH, Math.max(1, Math.round(BLUR_PLACEHOLDER_WIDTH * height / width)))
        .jpeg({ quality: 40 })
        .toBuffer()

      meta[file] = {
        w: width,
        h: height,
        b: `data:image/jpeg;base64,${placeholderBuffer.toString('base64')}`,
      }
      generated += 1
    }
    catch {
      // Skip files that sharp can't process (corrupted, etc.).
    }
  }

  await writeFile(IMAGE_META_PATH, JSON.stringify(meta), 'utf8')
  console.info(`[telecast] image meta: ${Object.keys(meta).length} entries (${generated} new)`)
}

run().catch((error) => {
  console.error('[telecast] failed to sync static content')
  console.error(error)
  process.exitCode = 1
})
