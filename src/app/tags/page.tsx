import { DEFAULT_LOCALE } from '@/lib/i18n'
import { renderTagsPage } from '@/lib/pages/tags-page'

export const dynamic = 'force-static'

export default async function DefaultTagsPage() {
  return renderTagsPage(DEFAULT_LOCALE)
}
