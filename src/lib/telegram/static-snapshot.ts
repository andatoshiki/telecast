import type { ChannelInfo } from '@/lib/types'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { getAppConfig } from '@/lib/config'
import { SITE_CONSTANTS } from '@/lib/constant'
import { getChannelInfo } from '@/lib/telegram'

export interface SnapshotPage {
  cursor: string
  channel: ChannelInfo
}

export interface StaticSnapshot {
  root: ChannelInfo
  pages: SnapshotPage[]
  beforeCursors: string[]
  afterCursors: string[]
  postIds: string[]
  searchQueries: string[]
}

const GENERATED_SNAPSHOT_PATH = path.resolve(process.cwd(), 'src/generated/static-snapshot.json')

let snapshotPromise: Promise<StaticSnapshot> | null = null

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function toSearchQuery(tag: string) {
  const normalized = tag.trim()
  if (!normalized) {
    return ''
  }
  return normalized.startsWith('#') ? normalized : `#${normalized}`
}

function getMaxStaticPages() {
  const pages = SITE_CONSTANTS.staticBuild.maxPages
  if (Number.isFinite(pages) && pages > 0) {
    return Math.floor(pages)
  }
  return 50
}

export async function buildRemoteStaticSnapshot(): Promise<StaticSnapshot> {
  const pages: SnapshotPage[] = []
  const maxPages = getMaxStaticPages()
  const visitedCursors = new Set<string>()
  let cursor = ''

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const channel = await getChannelInfo(cursor ? { before: cursor } : {}) as ChannelInfo
    if (!channel.posts.length) {
      break
    }

    pages.push({
      cursor,
      channel,
    })

    const nextCursor = channel.posts[channel.posts.length - 1]?.id || ''
    if (!nextCursor || visitedCursors.has(nextCursor)) {
      break
    }

    visitedCursors.add(nextCursor)
    cursor = nextCursor
  }

  const root = pages[0]?.channel || await getChannelInfo() as ChannelInfo
  const config = getAppConfig()

  const beforeCursors = uniqueStrings(
    pages
      .map(page => page.cursor)
      .filter(Boolean),
  )

  const afterCursors = uniqueStrings(
    pages
      .slice(1)
      .map(page => page.channel.posts[0]?.id || ''),
  )

  const postIds = uniqueStrings(
    pages.flatMap(page => page.channel.posts.map(post => post.id)),
  )

  const searchQueries = uniqueStrings([
    ...config.tags.map(toSearchQuery),
    ...pages.flatMap(page => page.channel.posts.flatMap(post => post.tags.map(toSearchQuery))),
  ])

  return {
    root,
    pages,
    beforeCursors,
    afterCursors,
    postIds,
    searchQueries,
  }
}

export async function writeGeneratedStaticSnapshot(snapshot: StaticSnapshot) {
  await mkdir(path.dirname(GENERATED_SNAPSHOT_PATH), { recursive: true })
  await writeFile(GENERATED_SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), 'utf8')
}

export async function readGeneratedStaticSnapshot() {
  try {
    const fileContent = await readFile(GENERATED_SNAPSHOT_PATH, 'utf8')
    const parsed = JSON.parse(fileContent) as StaticSnapshot
    if (!parsed?.root || !Array.isArray(parsed.pages) || !Array.isArray(parsed.postIds)) {
      return null
    }
    return parsed
  }
  catch {
    return null
  }
}

export function getGeneratedStaticSnapshotPath() {
  return GENERATED_SNAPSHOT_PATH
}

export function getStaticSnapshot() {
  if (!snapshotPromise) {
    snapshotPromise = readGeneratedStaticSnapshot()
      .then((snapshot) => {
        if (snapshot) {
          return snapshot
        }

        throw new Error(
          `[static-snapshot] Generated snapshot is missing at ${GENERATED_SNAPSHOT_PATH}. Run \`pnpm sync:content --build\` before \`pnpm build\`.`,
        )
      })
  }

  return snapshotPromise
}
