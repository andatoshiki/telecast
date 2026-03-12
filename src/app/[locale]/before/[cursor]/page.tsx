import { NON_DEFAULT_LOCALES, normalizeAppLocale } from '@/lib/i18n'
import { renderBeforePage } from '@/lib/pages/before-page'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export const dynamic = 'force-static'
export const dynamicParams = false

interface BeforePageProps {
  params: Promise<{
    locale: string
    cursor: string
  }>
}

export async function generateStaticParams() {
  const snapshot = await getStaticSnapshot()
  return NON_DEFAULT_LOCALES.flatMap(locale =>
    snapshot.beforeCursors.map(cursor => ({ locale, cursor })),
  )
}

export default async function BeforePage({ params }: BeforePageProps) {
  const { locale: localeParam, cursor = '' } = (await params) ?? {}
  const locale = normalizeAppLocale(localeParam)
  return renderBeforePage(locale, cursor)
}
