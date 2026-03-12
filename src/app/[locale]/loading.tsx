import { FeedListSkeleton } from '@/components/feed/feed-skeleton'
import { MainContentLoadingFrame } from '@/components/site/main-content-loading-frame'
import { getLocaleMessages, normalizeAppLocale } from '@/lib/i18n'

interface LoadingProps {
  params: Promise<{
    locale: string
  }>
}

export default async function Loading({ params }: LoadingProps) {
  const { locale: localeParam } = (await params) ?? {}
  const locale = normalizeAppLocale(localeParam)
  const messages = getLocaleMessages(locale)

  return (
    <MainContentLoadingFrame currentPath="/" locale={locale} messages={messages}>
      <FeedListSkeleton count={4} showPagination />
    </MainContentLoadingFrame>
  )
}
