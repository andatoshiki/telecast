import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import type { AppLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import { getAppConfig } from '@/lib/config'
import { getLocaleMessages, isAppLocale, localizePath, NON_DEFAULT_LOCALES } from '@/lib/i18n'
import { resolveSeoImageUrl } from '@/lib/seo'

interface LocaleLayoutProps {
  children: ReactNode
  params: Promise<{
    locale: string
  }>
}

export const dynamic = 'force-static'
export const dynamicParams = false

export async function generateStaticParams() {
  return NON_DEFAULT_LOCALES.map(locale => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = (await params) ?? {}
  const localeValue = locale || ''
  const resolvedLocale: AppLocale = isAppLocale(localeValue) ? localeValue : 'en'
  const messages = getLocaleMessages(locale)
  const config = getAppConfig()
  const { seo } = config
  const localTitle = seo.title || messages.metadata.titleDefault
  const localDescription = seo.description || messages.metadata.description
  const siteUrl = config.siteUrl || 'https://example.com'
  const resolvedOgImage = resolveSeoImageUrl(siteUrl, seo.ogImage)
  const localizedHomePath = localizePath(resolvedLocale, '/')
  const canonicalBase = (config.siteUrl || siteUrl).replace(/\/+$/, '')

  return {
    title: {
      default: localTitle,
      template: messages.metadata.titleTemplate,
    },
    description: localDescription,
    openGraph: {
      type: 'website',
      title: localTitle,
      description: localDescription,
      siteName: localTitle,
      url: `${siteUrl}${localizedHomePath}`,
      ...(resolvedOgImage ? { images: [{ url: resolvedOgImage, width: 1200, height: 630, alt: localTitle }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: localTitle,
      description: localDescription,
      ...(resolvedOgImage ? { images: [resolvedOgImage] } : {}),
      ...(config.twitter ? { creator: `@${config.twitter}` } : {}),
    },
    alternates: {
      canonical: `${canonicalBase}${localizedHomePath}`,
      languages: {
        en: '/',
        ja: '/ja',
        zh: '/zh',
      },
    },
  }
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = (await params) ?? {}

  if (!isAppLocale(locale)) {
    notFound()
  }

  return children
}
