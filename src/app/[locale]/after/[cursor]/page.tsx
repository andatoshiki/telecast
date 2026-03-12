import { redirect } from 'next/navigation'
import { localizePath, normalizeAppLocale, SUPPORTED_LOCALES } from '@/lib/i18n'
import {
  getSnapshotPageHref,
  getSnapshotPageIndexByAfterCursor,
} from '@/lib/pagination/snapshot-pagination'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export const dynamic = 'force-static'
export const dynamicParams = false

interface AfterPageProps {
  params: Promise<{
    locale: string
    cursor: string
  }>
}

export async function generateStaticParams() {
  const snapshot = await getStaticSnapshot()
  return SUPPORTED_LOCALES.flatMap(locale =>
    snapshot.afterCursors.map(cursor => ({ locale, cursor })),
  )
}

export default async function AfterPage({ params }: AfterPageProps) {
  const { cursor = '', locale: localeParam } = (await params) ?? {}
  const locale = normalizeAppLocale(localeParam)
  const snapshot = await getStaticSnapshot()
  const sourcePageIndex = getSnapshotPageIndexByAfterCursor(snapshot.pages, cursor)
  const targetPageIndex = sourcePageIndex - 1
  const targetHref = getSnapshotPageHref(snapshot.pages, targetPageIndex, locale) || localizePath(locale, '/')

  redirect(targetHref)
}
