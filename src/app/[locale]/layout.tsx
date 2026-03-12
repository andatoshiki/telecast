import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import type { AppLocale } from '@/lib/i18n'
import { getAppConfig } from '@/lib/config'
import { getLocaleMessages, isAppLocale, localizePath, SUPPORTED_LOCALES } from '@/lib/i18n'
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
  return SUPPORTED_LOCALES.map(locale => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = (await params) ?? {}
  const resolvedLocale: AppLocale = isAppLocale(locale || '') ? locale : 'en'
  const messages = getLocaleMessages(locale)
  const config = getAppConfig()
  const { seo } = config
  const localTitle = seo.title || seo.ogTitle || messages.metadata.titleDefault
  const localDescription = seo.description || seo.ogDescription || messages.metadata.description
  const siteUrl = config.siteUrl || 'https://example.com'
  const resolvedOgImage = resolveSeoImageUrl(siteUrl, seo.ogImage)
  const localizedHomePath = localizePath(resolvedLocale, '/')
  const canonicalBase = (seo.canonical || config.siteUrl || siteUrl).replace(/\/+$/, '')

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
      siteName: seo.ogSiteName || localTitle,
      url: `${siteUrl}${localizedHomePath}`,
      ...(resolvedOgImage ? { images: [{ url: resolvedOgImage, width: 1200, height: 630, alt: localTitle }] } : {}),
    },
    twitter: {
      card: seo.twitterCard || 'summary_large_image',
      title: localTitle,
      description: localDescription,
      ...(resolvedOgImage ? { images: [resolvedOgImage] } : {}),
      ...(seo.twitterCreator ? { creator: seo.twitterCreator } : {}),
      ...(seo.twitterSite ? { site: seo.twitterSite } : {}),
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
