import type { AppLocale } from '@/lib/i18n'
import { localizePath } from '@/lib/i18n'

interface SnapshotPageLike {
  cursor: string
  channel: {
    posts: Array<{
      id: string
    }>
  }
}

interface SnapshotPaginationLinks {
  olderHref: string | null
  newerHref: string | null
}

export function getSnapshotPageHref(pages: SnapshotPageLike[], pageIndex: number, locale?: AppLocale) {
  if (pageIndex <= 0) {
    return locale ? localizePath(locale, '/') : '/'
  }

  const cursor = pages[pageIndex]?.cursor || ''
  if (!cursor) {
    return null
  }

  const path = `/before/${cursor}`
  return locale ? localizePath(locale, path) : path
}

export function getSnapshotPaginationLinks(
  pages: SnapshotPageLike[],
  pageIndex: number,
  locale?: AppLocale,
): SnapshotPaginationLinks {
  const olderHref = pageIndex + 1 < pages.length
    ? getSnapshotPageHref(pages, pageIndex + 1, locale)
    : null
  const newerHref = pageIndex > 0
    ? getSnapshotPageHref(pages, pageIndex - 1, locale)
    : null

  return {
    olderHref,
    newerHref,
  }
}

export function getSnapshotPageIndexByBeforeCursor(pages: SnapshotPageLike[], cursor: string) {
  return pages.findIndex(page => page.cursor === cursor)
}

export function getSnapshotPageIndexByAfterCursor(pages: SnapshotPageLike[], cursor: string) {
  return pages.findIndex(page => page.channel.posts[0]?.id === cursor)
}
