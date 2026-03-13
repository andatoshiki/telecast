import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

export interface ImageMeta {
  w: number
  h: number
  /** Tiny base64 JPEG data URI for blur placeholder. */
  b: string
}

let metaCache: Record<string, ImageMeta> | null = null

const IMAGE_META_PATH = path.resolve(process.cwd(), 'public/media/image-meta.json')

/**
 * Loads and caches the build-time image metadata map.
 * Returns `{}` gracefully when the file hasn't been generated yet.
 */
export async function getImageMetaMap(): Promise<Record<string, ImageMeta>> {
  if (metaCache) {
    return metaCache
  }

  try {
    const raw = await readFile(IMAGE_META_PATH, 'utf8')
    metaCache = JSON.parse(raw) as Record<string, ImageMeta>
  }
  catch {
    metaCache = {}
  }

  return metaCache
}

/**
 * Extracts the local media filename from a proxy URL like `/media/abc123.jpg`.
 */
export function extractMediaFilename(src: string): string {
  const idx = src.lastIndexOf('/')
  return idx >= 0 ? src.slice(idx + 1) : src
}
