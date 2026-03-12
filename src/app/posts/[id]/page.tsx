import type { Metadata } from 'next'
import { DEFAULT_LOCALE } from '@/lib/i18n'
import { generatePostPageMetadata, renderPostPage } from '@/lib/pages/post-page'
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
  return generatePostPageMetadata(DEFAULT_LOCALE, id)
}

export default async function DefaultPostPage({ params }: DefaultPostPageProps) {
  const { id = '' } = (await params) ?? {}
  return renderPostPage(DEFAULT_LOCALE, id)
}
