import type { StaticSnapshot } from '../src/lib/telegram/static-snapshot'
import type { ChannelInfo } from '../src/lib/types'
import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as cheerio from 'cheerio'
import lunr from 'lunr'
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

  if (normalized.startsWith(`${MEDIA_DIRECTORY}/`)) {
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
  if (!normalizedUrl || normalizedUrl.startsWith(`${MEDIA_DIRECTORY}/`)) {
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

  if (isTty) {
    process.stdout.write(`${getLine()}\r`)
  }
  else {
    console.info(getLine())
  }

  return {
    tick() {
      if (closed) {
        return
      }

      completed = Math.min(total, completed + 1)
      if (isTty) {
        process.stdout.write(`${getLine()}\r`)
        return
      }

      const percent = Math.round((completed / total) * 100)
      if (percent - lastLoggedPercent >= 10 || completed === total) {
        lastLoggedPercent = percent
        console.info(getLine())
      }
    },
    finish() {
      if (closed) {
        return
      }

      closed = true
      completed = total
      if (isTty) {
        process.stdout.write(`${getLine()}\n`)
      }
      else if (lastLoggedPercent < 100) {
        console.info(getLine())
      }
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

    if (normalizedUrl.startsWith(`${MEDIA_DIRECTORY}/`)) {
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
        const rewrittenEntries = await Promise.all(entries.map(async entry => ({
          ...entry,
          url: await mirrorUrl(entry.url),
        })))
        element.attr(attribute, mergeSrcsetEntries(rewrittenEntries))
        continue
      }

      element.attr(attribute, await mirrorUrl(currentValue))
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
      const rewrittenUrl = await mirrorUrl(candidateUrl)
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
        channel.avatar = await mirrorUrl(channel.avatar)
      }

      channel.descriptionHTML = await rewriteHtmlMediaUrls(channel.descriptionHTML || '', mirrorUrl)

      for (const post of channel.posts) {
        post.content = await rewriteHtmlMediaUrls(post.content || '', mirrorUrl)

        for (const reaction of post.reactions) {
          if (reaction.emojiImage) {
            reaction.emojiImage = await mirrorUrl(reaction.emojiImage)
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

  if (shouldGenerateOgImage) {
    const ogResult = await generateOgImageFromChannel(mirroredSnapshot.root)
    console.info(`[telecast] og image: ${ogResult.relativePath}`)
  }
  else {
    console.info('[telecast] og image generation skipped pass --og-image to generate /og-auto.png')
  }
}

run().catch((error) => {
  console.error('[telecast] failed to sync static content')
  console.error(error)
  process.exitCode = 1
})
