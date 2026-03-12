import { DEFAULT_LOCALE } from '@/lib/i18n'
import { renderLinksPage } from '@/lib/pages/links-page'

export const dynamic = 'force-static'

export default async function DefaultLinksPage() {
  return renderLinksPage(DEFAULT_LOCALE)
}
