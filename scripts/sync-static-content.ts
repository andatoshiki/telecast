import type { StaticSnapshot } from '../src/lib/telegram/static-snapshot'
import type { ChannelInfo } from '../src/lib/types'
import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as cheerio from 'cheerio'
import lunr from 'lunr'
import { SITE_CONSTANTS } from '../src/lib/constant'
import { buildPostSearchDataset } from '../src/lib/search/search-documents'
import {
  buildRemoteStaticSnapshot,
  getGeneratedStaticSnapshotPath,
  writeGeneratedStaticSnapshot,
} from '../src/lib/telegram/static-snapshot'
import { generateOgImageFromChannel } from './generate-og-image'
import { buildImageKitMirror } from './imagekit-uploader'

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

type MirrorStats = LocalMirrorStats | Awaited<ReturnType<typeof buildImageKitMirror>> extends { getStats: () => infer S } ? S : never

function hasHttpProtocol(value: string) {
  return /^https?:\/\//i.test(value)
}

function fileExists(filePath: string) {
  return access(filePath).then(() => true).catch(() => false)
}

async function shouldSkipSyncInDev() {
  const snapshotPath = getGeneratedStaticSnapshotPath()
  const indexExists = await fileExists(SEARCH_INDEX_OUTPUT_PATH)
  const snapshotExists = await fileExists(snapshotPath)
  if (!indexExists || !snapshotExists) {
    return false
  }

  const refreshWindowMs = SITE_CONSTANTS.staticBuild.devRefreshMinutes * 60 * 1000
  const snapshotStat = await stat(snapshotPath)
  const ageMs = Date.now() - snapshotStat.mtimeMs
  return ageMs >= 0 && ageMs < refreshWindowMs
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

async function buildMediaMirror() {
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
  const { mirrorUrl, getStats } = SITE_CONSTANTS.imagekit
    ? await buildImageKitMirror()
    : await buildMediaMirror()

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

async function readSnapshotFile() {
  try {
    const snapshotPath = getGeneratedStaticSnapshotPath()
    const fileContent = await readFile(snapshotPath, 'utf8')
    const parsed = JSON.parse(fileContent) as StaticSnapshot
    return parsed
  }
  catch {
    return null
  }
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
  const mode = process.argv.includes('--build') ? 'build' : 'dev'
  const allowEmpty = process.argv.includes('--allow-empty')

  if (mode === 'dev' && !process.argv.includes('--force')) {
    const skip = await shouldSkipSyncInDev()
    if (skip) {
      console.info('[sync-static-content] Snapshot and search index are fresh. Skipping dev sync.')
      return
    }
  }

  const previousSnapshot = await readSnapshotFile()

  console.info('[sync-static-content] Fetching Telegram snapshot...')
  const remoteSnapshot = await buildRemoteStaticSnapshot()

  if (!hasPosts(remoteSnapshot) && !allowEmpty) {
    if (hasPosts(previousSnapshot)) {
      console.warn('[sync-static-content] Remote snapshot is empty. Keeping existing generated snapshot.')
      const { snapshot: mirroredPreviousSnapshot, stats } = await mirrorSnapshotAssets(previousSnapshot as StaticSnapshot)
      await writeGeneratedStaticSnapshot(mirroredPreviousSnapshot)
      await writeStaticSearchIndex(mirroredPreviousSnapshot)
      const ogResult = await generateOgImageFromChannel(mirroredPreviousSnapshot.root)
      console.info('[sync-static-content] Completed using existing snapshot.')
      console.info(`[sync-static-content] Pages: ${mirroredPreviousSnapshot.pages.length}, Posts: ${mirroredPreviousSnapshot.postIds.length}`)
      if (stats.provider === 'imagekit') {
        console.info(`[sync-static-content] Media URLs processed: ${stats.resolvedCount}, Uploaded to ImageKit: ${stats.uploadedCount}`)
        console.info(`[sync-static-content] ImageKit endpoint: ${stats.imageKitEndpoint}, Force WebP: ${stats.forceWebp ? 'yes' : 'no'}`)
      }
      else {
        console.info(`[sync-static-content] Mirrored media URLs: ${stats.resolvedCount}, New downloads: ${stats.downloadedCount}`)
      }
      console.info(`[sync-static-content] OG image: ${ogResult.relativePath} (avatar: ${ogResult.usedAvatar ? 'yes' : 'no'})`)
      return
    }

    throw new Error(
      `Remote snapshot has no posts and no previous generated snapshot exists. ${
        'Check network access to Telegram or run with --allow-empty to keep an intentionally empty snapshot.'
      }`,
    )
  }

  console.info(SITE_CONSTANTS.imagekit
    ? '[sync-static-content] Uploading media to ImageKit...'
    : '[sync-static-content] Mirroring media locally...')
  const { snapshot: mirroredSnapshot, stats } = await mirrorSnapshotAssets(remoteSnapshot)

  await writeGeneratedStaticSnapshot(mirroredSnapshot)
  await writeStaticSearchIndex(mirroredSnapshot)
  const ogResult = await generateOgImageFromChannel(mirroredSnapshot.root)

  console.info('[sync-static-content] Completed.')
  console.info(`[sync-static-content] Pages: ${mirroredSnapshot.pages.length}, Posts: ${mirroredSnapshot.postIds.length}`)
  if (stats.provider === 'imagekit') {
    console.info(`[sync-static-content] Media URLs processed: ${stats.resolvedCount}, Uploaded to ImageKit: ${stats.uploadedCount}`)
    console.info(`[sync-static-content] ImageKit endpoint: ${stats.imageKitEndpoint}, Force WebP: ${stats.forceWebp ? 'yes' : 'no'}`)
  }
  else {
    console.info(`[sync-static-content] Mirrored media URLs: ${stats.resolvedCount}, New downloads: ${stats.downloadedCount}`)
  }
  console.info(`[sync-static-content] OG image: ${ogResult.relativePath} (avatar: ${ogResult.usedAvatar ? 'yes' : 'no'})`)

  const snapshotPath = getGeneratedStaticSnapshotPath()
  const savedSnapshot = await readSnapshotFile()
  if (!savedSnapshot) {
    throw new Error(`Snapshot was not written to ${snapshotPath}`)
  }
}

run().catch((error) => {
  console.error('[sync-static-content] Failed to sync static content.')
  console.error(error)
  process.exitCode = 1
})
