import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import path from 'node:path'
import process from 'node:process'
import { SITE_CONSTANTS } from '../src/lib/constant'

const IMAGEKIT_UPLOAD_API = 'https://upload.imagekit.io/api/v1/files/upload'

const IMAGE_EXTENSIONS = new Set([
  '.avif',
  '.bmp',
  '.gif',
  '.heic',
  '.heif',
  '.jpeg',
  '.jpg',
  '.png',
  '.tif',
  '.tiff',
  '.webp',
])

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

type MediaType = 'image' | 'video' | 'unknown'

interface ImageKitConfig {
  urlEndpoint: string
  privateKey: string
  folder: string
  forceWebp: boolean
}

interface MirroredMediaResult {
  url: string
  mediaType: MediaType
}

export interface ImageKitMirrorStats {
  provider: 'imagekit'
  resolvedCount: number
  uploadedCount: number
  imageKitEndpoint: string
  forceWebp: boolean
}

let hasLoadedLocalEnv = false

function loadLocalEnvFiles() {
  if (hasLoadedLocalEnv) {
    return
  }

  const candidateFiles = ['.env', '.env.local']
  for (const fileName of candidateFiles) {
    try {
      process.loadEnvFile(path.resolve(process.cwd(), fileName))
    }
    catch {
      // Ignore missing or unreadable local env files.
    }
  }

  hasLoadedLocalEnv = true
}

function hasHttpProtocol(value: string) {
  return /^https?:\/\//i.test(value)
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

function normalizeImageKitEndpoint(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  try {
    const parsed = new URL(trimmed)
    parsed.hash = ''
    parsed.search = ''
    return parsed.toString().replace(/\/+$/, '')
  }
  catch {
    return ''
  }
}

function normalizeImageKitFolder(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return '/telecast'
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return normalized.replace(/\/+$/, '') || '/telecast'
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean) {
  if (typeof value !== 'string') {
    return defaultValue
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return defaultValue
  }

  return normalized === '1'
    || normalized === 'true'
    || normalized === 'yes'
    || normalized === 'on'
}

function getImageKitConfig(): ImageKitConfig {
  loadLocalEnvFiles()

  const urlEndpoint = normalizeImageKitEndpoint(process.env.IMAGEKIT_URL_ENDPOINT || '')
  const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || '').trim()
  const folder = normalizeImageKitFolder(process.env.IMAGEKIT_FOLDER || '')
  const forceWebp = parseBooleanEnv(process.env.IMAGEKIT_FORCE_WEBP, true)

  if (!urlEndpoint) {
    throw new Error('Missing IMAGEKIT_URL_ENDPOINT. Example: https://ik.imagekit.io/your_imagekit_id')
  }

  if (!privateKey) {
    throw new Error('Missing IMAGEKIT_PRIVATE_KEY. Set it in your environment before running sync/build.')
  }

  return {
    urlEndpoint,
    privateKey,
    folder,
    forceWebp,
  }
}

function getFileExtensionFromUrl(url: string) {
  try {
    return normalizeFileExtensionFromPathname(new URL(url).pathname)
  }
  catch {
    return ''
  }
}

function inferMediaTypeFromUrl(url: string): MediaType {
  const ext = getFileExtensionFromUrl(url)
  if (!ext) {
    return 'unknown'
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    return 'image'
  }

  if (ext === '.mp4' || ext === '.webm' || ext === '.mov' || ext === '.m4v') {
    return 'video'
  }

  return 'unknown'
}

function isImageKitUrl(url: string, imageKitConfig: ImageKitConfig) {
  return url.startsWith(imageKitConfig.urlEndpoint)
}

function applyWebpTransform(url: string) {
  try {
    const parsed = new URL(url)
    const currentTransform = parsed.searchParams.get('tr')?.trim() || ''
    if (!currentTransform) {
      parsed.searchParams.set('tr', 'f-webp')
      return parsed.toString()
    }

    const transforms = currentTransform
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)

    if (!transforms.includes('f-webp')) {
      transforms.push('f-webp')
      parsed.searchParams.set('tr', transforms.join(','))
    }

    return parsed.toString()
  }
  catch {
    const joiner = url.includes('?') ? '&' : '?'
    return `${url}${joiner}tr=f-webp`
  }
}

function maybeApplyWebpTransform(url: string, mediaType: MediaType, imageKitConfig: ImageKitConfig) {
  if (!imageKitConfig.forceWebp) {
    return url
  }

  if (!isImageKitUrl(url, imageKitConfig)) {
    return url
  }

  if (mediaType === 'image') {
    const ext = getFileExtensionFromUrl(url)
    if (ext === '.svg') {
      return url
    }
    return applyWebpTransform(url)
  }

  return url
}

function normalizeRemoteMediaUrl(input: string) {
  const normalized = normalizeProxyLikeUrl(input)
  if (!normalized) {
    return ''
  }

  if (normalized.startsWith(`${SITE_CONSTANTS.mediaMirror.directory}/`)) {
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

export async function buildImageKitMirror() {
  const imageKitConfig = getImageKitConfig()
  const replacementCache = new Map<string, Promise<MirroredMediaResult>>()
  let uploadedCount = 0

  async function mirrorUrl(rawValue: string) {
    const normalizedUrl = normalizeRemoteMediaUrl(rawValue)
    if (!normalizedUrl) {
      return rawValue
    }

    const mediaType = inferMediaTypeFromUrl(normalizedUrl)

    if (isImageKitUrl(normalizedUrl, imageKitConfig)) {
      return maybeApplyWebpTransform(normalizedUrl, mediaType, imageKitConfig)
    }

    const cachedPromise = replacementCache.get(normalizedUrl)
    if (cachedPromise) {
      const cachedResult = await cachedPromise
      return maybeApplyWebpTransform(cachedResult.url, cachedResult.mediaType, imageKitConfig)
    }

    const pending = (async () => {
      try {
        const extension = getFileExtension(normalizedUrl, '')
        const fileName = createMediaFileName(normalizedUrl, extension)

        const formData = new FormData()
        formData.append('file', normalizedUrl)
        formData.append('fileName', fileName)
        formData.append('folder', imageKitConfig.folder)
        formData.append('useUniqueFileName', 'false')
        formData.append('overwriteFile', 'true')

        const authHeader = Buffer.from(`${imageKitConfig.privateKey}:`).toString('base64')
        const response = await fetch(IMAGEKIT_UPLOAD_API, {
          method: 'POST',
          headers: {
            'authorization': `Basic ${authHeader}`,
            'user-agent': SITE_CONSTANTS.mediaMirror.userAgent,
            'accept': 'application/json',
          },
          body: formData,
        })

        if (!response.ok) {
          return {
            url: rawValue,
            mediaType,
          } as MirroredMediaResult
        }

        const payload = await response.json() as {
          url?: unknown
          fileType?: unknown
        }

        const uploadedUrl = typeof payload.url === 'string' ? payload.url.trim() : ''
        if (!uploadedUrl) {
          return {
            url: rawValue,
            mediaType,
          } as MirroredMediaResult
        }

        const uploadedMediaType = typeof payload.fileType === 'string'
          ? payload.fileType.trim().toLowerCase()
          : ''

        uploadedCount += 1
        return {
          url: uploadedUrl,
          mediaType: uploadedMediaType === 'image' || uploadedMediaType === 'video'
            ? uploadedMediaType
            : inferMediaTypeFromUrl(uploadedUrl),
        } as MirroredMediaResult
      }
      catch {
        return {
          url: rawValue,
          mediaType,
        } as MirroredMediaResult
      }
    })()

    replacementCache.set(normalizedUrl, pending)
    const resolved = await pending
    return maybeApplyWebpTransform(resolved.url, resolved.mediaType, imageKitConfig)
  }

  return {
    mirrorUrl,
    getStats: () => ({
      provider: 'imagekit' as const,
      resolvedCount: replacementCache.size,
      uploadedCount,
      imageKitEndpoint: imageKitConfig.urlEndpoint,
      forceWebp: imageKitConfig.forceWebp,
    }),
  }
}
