import { normalizeAppLocale } from '@/lib/i18n'
import { renderLinksPage } from '@/lib/pages/links-page'

export const dynamic = 'force-static'

interface LinksPageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function LinksPage({ params }: LinksPageProps) {
  const { locale: localeParam } = (await params) ?? {}
  const locale = normalizeAppLocale(localeParam)
  return renderLinksPage(locale)
}
