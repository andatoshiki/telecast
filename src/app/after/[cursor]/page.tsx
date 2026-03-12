import LocaleAfterPage from '@/app/[locale]/after/[cursor]/page'
import { DEFAULT_LOCALE } from '@/lib/i18n'
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
  return LocaleAfterPage({
    params: Promise.resolve({
      locale: DEFAULT_LOCALE,
      cursor,
    }),
  })
}
