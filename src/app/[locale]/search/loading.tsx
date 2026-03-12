import { FeedListSkeleton } from '@/components/feed/feed-skeleton'
import { MainContentLoadingFrame } from '@/components/site/main-content-loading-frame'
import { Skeleton } from '@/components/ui/skeleton'
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
    <MainContentLoadingFrame currentPath="/search" locale={locale} messages={messages}>
      <div className="px-4 py-3">
        <Skeleton className="h-4 w-52" />
      </div>
      <FeedListSkeleton count={3} showPagination={false} />
    </MainContentLoadingFrame>
  )
}
