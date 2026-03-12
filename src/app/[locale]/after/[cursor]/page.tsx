import { NON_DEFAULT_LOCALES, normalizeAppLocale } from '@/lib/i18n'
import { redirectAfterPage } from '@/lib/pages/after-page'
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
  return NON_DEFAULT_LOCALES.flatMap(locale =>
    snapshot.afterCursors.map(cursor => ({ locale, cursor })),
  )
}

export default async function AfterPage({ params }: AfterPageProps) {
  const { cursor = '', locale: localeParam } = (await params) ?? {}
  const locale = normalizeAppLocale(localeParam)
  return redirectAfterPage(locale, cursor)
}
