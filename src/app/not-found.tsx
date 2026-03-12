import { NotFoundPanel } from '@/components/site/not-found-panel'
import { DEFAULT_LOCALE, getLocaleMessages } from '@/lib/i18n'

export default function NotFound() {
  const locale = DEFAULT_LOCALE
  const messages = getLocaleMessages(locale)

  return <NotFoundPanel locale={locale} messages={messages} />
}
