import { normalizeAppLocale } from '@/lib/i18n'
import { renderSearchPage } from '@/lib/pages/search-page'

export const dynamic = 'force-static'

interface SearchPageProps {
  params: Promise<{
    locale: string
  }>
  searchParams: Promise<{
    q?: string | string[]
  }>
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale: localeParam } = (await params) ?? {}
  const locale = normalizeAppLocale(localeParam)
  const resolvedSearchParams = (await searchParams) ?? {}
  return renderSearchPage(locale, resolvedSearchParams)
}
