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
    <MainContentLoadingFrame currentPath="/tags" locale={locale} messages={messages}>
      <div className="p-4">
        <div className="space-y-4 rounded-2xl border p-6">
          <Skeleton className="h-6 w-20" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </MainContentLoadingFrame>
  )
}
