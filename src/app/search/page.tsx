import { DEFAULT_LOCALE } from '@/lib/i18n'
import { renderSearchPage } from '@/lib/pages/search-page'

export const dynamic = 'force-static'

interface DefaultSearchPageProps {
  searchParams: Promise<{
    q?: string | string[]
  }>
}

export default async function DefaultSearchPage({ searchParams }: DefaultSearchPageProps) {
  return renderSearchPage(DEFAULT_LOCALE, (await searchParams) ?? {})
}
