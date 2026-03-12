'use client'

import { useParams } from 'next/navigation'
import { NotFoundPanel } from '@/components/site/not-found-panel'
import { getLocaleMessages, normalizeAppLocale } from '@/lib/i18n'

export default function NotFound() {
  const params = useParams<{ locale?: string | string[] }>()
  const localeValue = Array.isArray(params.locale) ? params.locale[0] : params.locale
  const locale = normalizeAppLocale(localeValue)
  const messages = getLocaleMessages(locale)

  return <NotFoundPanel locale={locale} messages={messages} />
}
