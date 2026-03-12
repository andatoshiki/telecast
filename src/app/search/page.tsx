import LocaleSearchPage from '@/app/[locale]/search/page'
import { DEFAULT_LOCALE } from '@/lib/i18n'

export const dynamic = 'force-static'

interface DefaultSearchPageProps {
  searchParams: Promise<{
    q?: string | string[]
  }>
}

export default async function DefaultSearchPage({ searchParams }: DefaultSearchPageProps) {
  return LocaleSearchPage({
    params: Promise.resolve({ locale: DEFAULT_LOCALE }),
    searchParams,
  })
}
