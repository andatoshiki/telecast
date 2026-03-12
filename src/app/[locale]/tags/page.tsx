import { normalizeAppLocale } from '@/lib/i18n'
import { renderTagsPage } from '@/lib/pages/tags-page'

export const dynamic = 'force-static'

interface TagsPageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function TagsPage({ params }: TagsPageProps) {
  const { locale: localeParam } = (await params) ?? {}
  const locale = normalizeAppLocale(localeParam)
  return renderTagsPage(locale)
}
