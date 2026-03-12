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
    <MainContentLoadingFrame currentPath="/links" locale={locale} messages={messages}>
      <div className="p-4">
        <div className="space-y-4 rounded-2xl border p-6">
          <Skeleton className="h-6 w-24" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </MainContentLoadingFrame>
  )
}
