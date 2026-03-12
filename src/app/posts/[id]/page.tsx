import type { Metadata } from 'next'
import LocalePostPage, { generateMetadata as generateLocalePostMetadata } from '@/app/[locale]/posts/[id]/page'
import { DEFAULT_LOCALE } from '@/lib/i18n'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export const dynamic = 'force-static'
export const dynamicParams = false

interface DefaultPostPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateStaticParams() {
  const snapshot = await getStaticSnapshot()
  return snapshot.postIds.map(id => ({ id }))
}

export async function generateMetadata({ params }: DefaultPostPageProps): Promise<Metadata> {
  const { id = '' } = (await params) ?? {}
  return generateLocalePostMetadata({
    params: Promise.resolve({
      locale: DEFAULT_LOCALE,
      id,
    }),
  })
}

export default async function DefaultPostPage({ params }: DefaultPostPageProps) {
  const { id = '' } = (await params) ?? {}
  return LocalePostPage({
    params: Promise.resolve({
      locale: DEFAULT_LOCALE,
      id,
    }),
  })
}
