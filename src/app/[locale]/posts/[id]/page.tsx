import type { Metadata } from 'next'
import { NON_DEFAULT_LOCALES, normalizeAppLocale } from '@/lib/i18n'
import { generatePostPageMetadata, renderPostPage } from '@/lib/pages/post-page'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export const dynamic = 'force-static'
export const dynamicParams = false

interface PostPageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export async function generateStaticParams() {
  const snapshot = await getStaticSnapshot()
  return NON_DEFAULT_LOCALES.flatMap(locale =>
    snapshot.postIds.map(id => ({ locale, id })),
  )
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { locale: localeParam, id = '' } = (await params) ?? {}
  const locale = normalizeAppLocale(localeParam)
  return generatePostPageMetadata(locale, id)
}

export default async function PostPage({ params }: PostPageProps) {
  const { locale: localeParam, id = '' } = (await params) ?? {}
  const locale = normalizeAppLocale(localeParam)
  return renderPostPage(locale, id)
}
