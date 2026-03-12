import LocaleTagsPage from '@/app/[locale]/tags/page'
import { DEFAULT_LOCALE } from '@/lib/i18n'

export const dynamic = 'force-static'

export default async function DefaultTagsPage() {
  return LocaleTagsPage({
    params: Promise.resolve({ locale: DEFAULT_LOCALE }),
  })
}
