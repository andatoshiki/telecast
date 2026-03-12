import type { ChannelInfo } from '@/lib/types'
import { PageFrame } from '@/components/site/page-frame'
import { SearchResultsPanel } from '@/components/site/search-results-panel'
import { getLocaleMessages, normalizeAppLocale } from '@/lib/i18n'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

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
  const messages = getLocaleMessages(locale)
  const resolvedSearchParams = (await searchParams) ?? {}
  const queryValue = Array.isArray(resolvedSearchParams.q) ? resolvedSearchParams.q[0] : resolvedSearchParams.q
  const currentLocalePath = queryValue
    ? `/search?q=${encodeURIComponent(queryValue)}`
    : '/search'
  const snapshot = await getStaticSnapshot()
  const channel = snapshot.root as ChannelInfo

  return (
    <PageFrame
      channel={channel}
      currentPath="/search"
      locale={locale}
      messages={messages}
      currentLocalePath={currentLocalePath}
    >
      <SearchResultsPanel locale={locale} messages={messages} />
    </PageFrame>
  )
}
