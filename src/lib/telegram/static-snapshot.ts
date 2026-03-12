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
  const pages = SITE_CONSTANTS.maxPages
  if (Number.isFinite(pages) && pages > 0) {
    return Math.floor(pages)
  }
  return 50
}

interface SnapshotFetchTracker {
  tick: (cursor: string) => void
  finish: () => void
}

function createSnapshotFetchTracker(host: string, channel: string): SnapshotFetchTracker {
  let requestCount = 0
  const isTty = Boolean(process.stdout.isTTY)

  const formatLine = (cursor: string) => {
    const baseUrl = `https://${host}/s/${channel}`
    const cursorLabel = cursor || '-'
    return `[telecast] fetching ${baseUrl} before=${cursorLabel} request=${requestCount}`
  }

  return {
    tick(cursor: string) {
      requestCount += 1
      const line = formatLine(cursor)
      if (isTty) {
        process.stdout.write(`${line}\r`)
      }
      else {
        console.info(line)
      }
    },
    finish() {
      if (isTty && requestCount > 0) {
        process.stdout.write('\n')
      }
    },
  }
}

export async function buildRemoteStaticSnapshot(): Promise<StaticSnapshot> {
  const config = getAppConfig()
  const pages: SnapshotPage[] = []
  const maxPages = getMaxStaticPages()
  const visitedCursors = new Set<string>()
  let cursor = ''
  const fetchTracker = createSnapshotFetchTracker(config.telegramHost, config.channel)

  try {
    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
      fetchTracker.tick(cursor)
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

    if (!pages.length) {
      fetchTracker.tick('')
    }
  }
  finally {
    fetchTracker.finish()
  }

  const root = pages[0]?.channel || await getChannelInfo() as ChannelInfo

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
          `[telecast] generated snapshot is missing at ${GENERATED_SNAPSHOT_PATH}. run \`pnpm sync\` before \`pnpm build\`.`,
        )
      })
  }

  return snapshotPromise
}
