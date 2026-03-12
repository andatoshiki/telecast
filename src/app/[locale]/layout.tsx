import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getAppConfig } from '@/lib/config'
import { getLocaleMessages, isAppLocale, SUPPORTED_LOCALES } from '@/lib/i18n'

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
  const messages = getLocaleMessages(locale)
  const config = getAppConfig()
  const { seo } = config
  const localTitle = seo.title || seo.ogTitle || messages.metadata.titleDefault
  const localDescription = seo.description || seo.ogDescription || messages.metadata.description

  return {
    title: {
      default: localTitle,
      template: messages.metadata.titleTemplate,
    },
    description: localDescription,
    openGraph: {
      title: localTitle,
      description: localDescription,
      siteName: seo.ogSiteName || localTitle,
      url: `${config.siteUrl || 'https://example.com'}/${locale}`,
    },
    alternates: {
      canonical: `${seo.canonical || config.siteUrl}/${locale}`,
      languages: {
        en: '/en',
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
