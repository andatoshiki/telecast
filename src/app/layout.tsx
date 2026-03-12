import type { Metadata } from 'next'
import Script from 'next/script'
import { JsonLd } from '@/components/site/json-ld'
import { ThemeProvider } from '@/components/site/theme-provider'
import { getAppConfig } from '@/lib/config'
import { enMessages } from '@/locales/en'
import './globals.css'

const config = getAppConfig()
const { seo, analytics } = config

const siteUrl = config.siteUrl || 'https://example.com'
const defaultTitle = seo.title || seo.ogTitle || enMessages.metadata.titleDefault
const defaultDescription = seo.description || seo.ogDescription || enMessages.metadata.description

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: enMessages.metadata.titleTemplate,
  },
  description: defaultDescription,
  keywords: seo.keywords.length > 0 ? seo.keywords : undefined,
  authors: seo.author ? [{ name: seo.author }] : undefined,
  creator: seo.author || undefined,
  openGraph: {
    type: 'website',
    siteName: seo.ogSiteName || defaultTitle,
    title: seo.ogTitle || defaultTitle,
    description: seo.ogDescription || defaultDescription,
    url: seo.ogUrl || seo.canonical || siteUrl,
    ...(seo.ogImage ? { images: [{ url: seo.ogImage, width: 1200, height: 630, alt: defaultTitle }] } : {}),
  },
  twitter: {
    card: seo.twitterCard || 'summary_large_image',
    title: seo.ogTitle || defaultTitle,
    description: seo.ogDescription || defaultDescription,
    ...(seo.ogImage ? { images: [seo.ogImage] } : {}),
    ...(seo.twitterCreator ? { creator: seo.twitterCreator } : config.twitter ? { creator: `@${config.twitter}` } : {}),
    ...(seo.twitterSite ? { site: seo.twitterSite } : {}),
  },
  alternates: {
    ...(seo.canonical ? { canonical: seo.canonical } : {}),
    types: {
      'application/rss+xml': '/rss.xml',
    },
  },
  ...(seo.themeColor ? { themeColor: seo.themeColor } : {}),
  robots: {
    index: seo.robots.index,
    follow: seo.robots.follow,
    googleBot: {
      'index': seo.robots.googleBot.index,
      'follow': seo.robots.googleBot.follow,
      'max-video-preview': seo.robots.googleBot['max-video-preview'],
      'max-image-preview': seo.robots.googleBot['max-image-preview'],
      'max-snippet': seo.robots.googleBot['max-snippet'],
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Blog',
            'name': seo.ogSiteName || defaultTitle,
            'description': defaultDescription,
            'url': seo.ogUrl || seo.canonical || siteUrl,
            'author': {
              '@type': 'Person',
              'name': seo.author || 'Unknown',
            },
            ...(seo.ogImage ? { image: `${siteUrl}${seo.ogImage}` } : {}),
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>

        {analytics.googleAnalyticsId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${analytics.googleAnalyticsId}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${analytics.googleAnalyticsId}');`}
            </Script>
          </>
        )}

        {analytics.umamiScriptUrl && analytics.umamiWebsiteId && (
          <Script
            defer
            src={analytics.umamiScriptUrl}
            data-website-id={analytics.umamiWebsiteId}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  )
}
