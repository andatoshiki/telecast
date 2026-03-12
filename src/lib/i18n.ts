import type { LocaleMessages } from '@/locales/en'
import { enMessages } from '@/locales/en'
import { jaMessages } from '@/locales/ja'
import { zhMessages } from '@/locales/zh'

export const SUPPORTED_LOCALES = ['en', 'ja', 'zh'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'en'
export const NON_DEFAULT_LOCALES = SUPPORTED_LOCALES.filter(locale => locale !== DEFAULT_LOCALE) as Exclude<AppLocale, typeof DEFAULT_LOCALE>[]

const EXTERNAL_URL_PATTERN = /^[a-z][a-z\d+\-.]*:/i

const MESSAGES: Record<AppLocale, LocaleMessages> = {
  en: enMessages,
  ja: jaMessages,
  zh: zhMessages,
}

export function isAppLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function normalizeAppLocale(value?: string | null): AppLocale {
  const normalized = (value || '').trim().toLowerCase()

  if (!normalized) {
    return DEFAULT_LOCALE
  }

  if (isAppLocale(normalized)) {
    return normalized
  }

  if (normalized.startsWith('ja')) {
    return 'ja'
  }

  if (normalized.startsWith('zh')) {
    return 'zh'
  }

  return 'en'
}

export function getLocaleMessages(locale?: string | null): LocaleMessages {
  return MESSAGES[normalizeAppLocale(locale)]
}

export function localizePath(locale: AppLocale, path: string) {
  const isDefaultLocale = locale === DEFAULT_LOCALE

  if (!path) {
    return isDefaultLocale ? '/' : `/${locale}`
  }

  if (EXTERNAL_URL_PATTERN.test(path) || path.startsWith('//')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (normalizedPath === '/') {
    return isDefaultLocale ? '/' : `/${locale}`
  }

  const detectedLocale = getLocaleFromPath(normalizedPath)
  if (detectedLocale) {
    if (isDefaultLocale && detectedLocale === DEFAULT_LOCALE) {
      return stripLocalePrefix(normalizedPath)
    }
    return normalizedPath
  }

  if (isDefaultLocale) {
    return normalizedPath
  }

  return `/${locale}${normalizedPath}`
}

export function getLocaleFromPath(pathname: string): AppLocale | null {
  const [pathnameOnly] = pathname.split(/[?#]/, 1)
  const segments = pathnameOnly.split('/').filter(Boolean)
  const locale = segments[0]

  if (locale && isAppLocale(locale)) {
    return locale
  }

  return null
}

export function stripLocalePrefix(pathname: string) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  const [pathnameOnly, suffix = ''] = normalizedPath.split(/([?#].*)/, 2)
  const segments = pathnameOnly.split('/').filter(Boolean)

  if (segments.length === 0) {
    return '/'
  }

  if (isAppLocale(segments[0] || '')) {
    const remainder = segments.slice(1).join('/')
    const stripped = remainder ? `/${remainder}` : '/'
    return suffix ? `${stripped}${suffix}` : stripped
  }

  return normalizedPath
}
