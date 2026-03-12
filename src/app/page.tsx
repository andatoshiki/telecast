import { redirect } from 'next/navigation'
import { DEFAULT_LOCALE, localizePath } from '@/lib/i18n'

export const dynamic = 'force-static'

export default function RootPage() {
  redirect(localizePath(DEFAULT_LOCALE, '/'))
}
