import LocaleBeforePage from '@/app/[locale]/before/[cursor]/page'
import { DEFAULT_LOCALE } from '@/lib/i18n'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export const dynamic = 'force-static'
export const dynamicParams = false

interface DefaultBeforePageProps {
  params: Promise<{
    cursor: string
  }>
}

export async function generateStaticParams() {
  const snapshot = await getStaticSnapshot()
  return snapshot.beforeCursors.map(cursor => ({ cursor }))
}

export default async function DefaultBeforePage({ params }: DefaultBeforePageProps) {
  const { cursor = '' } = (await params) ?? {}
  return LocaleBeforePage({
    params: Promise.resolve({
      locale: DEFAULT_LOCALE,
      cursor,
    }),
  })
}
