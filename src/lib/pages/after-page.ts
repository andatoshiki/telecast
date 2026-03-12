import type { AppLocale } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import { localizePath } from '@/lib/i18n'
import {
  getSnapshotPageHref,
  getSnapshotPageIndexByAfterCursor,
} from '@/lib/pagination/snapshot-pagination'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export async function redirectAfterPage(locale: AppLocale, cursor: string) {
  const snapshot = await getStaticSnapshot()
  const sourcePageIndex = getSnapshotPageIndexByAfterCursor(snapshot.pages, cursor)
  const targetPageIndex = sourcePageIndex - 1
  const targetHref = getSnapshotPageHref(snapshot.pages, targetPageIndex, locale) || localizePath(locale, '/')

  redirect(targetHref)
}
