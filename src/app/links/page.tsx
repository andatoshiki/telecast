import LocaleLinksPage from '@/app/[locale]/links/page'
import { DEFAULT_LOCALE } from '@/lib/i18n'

export const dynamic = 'force-static'

export default async function DefaultLinksPage() {
  return LocaleLinksPage({
    params: Promise.resolve({ locale: DEFAULT_LOCALE }),
  })
}
