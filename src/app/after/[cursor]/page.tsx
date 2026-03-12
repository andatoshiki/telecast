import { DEFAULT_LOCALE } from '@/lib/i18n'
import { redirectAfterPage } from '@/lib/pages/after-page'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export const dynamic = 'force-static'
export const dynamicParams = false

interface DefaultAfterPageProps {
  params: Promise<{
    cursor: string
  }>
}

export async function generateStaticParams() {
  const snapshot = await getStaticSnapshot()
  return snapshot.afterCursors.map(cursor => ({ cursor }))
}

export default async function DefaultAfterPage({ params }: DefaultAfterPageProps) {
  const { cursor = '' } = (await params) ?? {}
  return redirectAfterPage(DEFAULT_LOCALE, cursor)
}
