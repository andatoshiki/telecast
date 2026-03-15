import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { JsonLd } from '@/components/site/json-ld'
import { ServiceWorkerRegister } from '@/components/site/service-worker-register'
import { ThemeProvider } from '@/components/site/theme-provider'
import { getAppConfig } from '@/lib/config'
import { resolveSeoImageUrl } from '@/lib/seo'
import { enMessages } from '@/locales/en'
import './globals.css'

const config = getAppConfig()
const { seo, analytics } = config

const siteUrl = config.siteUrl || 'https://example.com'
const defaultTitle = seo.title || enMessages.metadata.titleDefault
const defaultDescription = seo.description || enMessages.metadata.description
const resolvedOgImage = resolveSeoImageUrl(siteUrl, seo.ogImage)
const metaKeywords = Array.from(new Set(
  [...seo.keywords]
    .map(keyword => keyword.replace(/^#/, '').trim())
    .filter(Boolean),
))
const devServiceWorkerCleanupScript = `(() => {
  const localHosts = ['localhost', '127.0.0.1', '[::1]']
  if (!localHosts.includes(window.location.hostname)) {
    return
  }

  if (!('serviceWorker' in navigator)) {
    return
  }

  const reloadKey = 'telecast:dev-sw-reset'
  const clearCaches = async () => {
    if (!('caches' in window)) {
      return
    }

    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter(key => key.startsWith('telecast-'))
        .map(key => caches.delete(key)),
    )
  }

  navigator.serviceWorker.getRegistrations()
    .then(async (registrations) => {
      if (registrations.length === 0) {
        sessionStorage.removeItem(reloadKey)
        await clearCaches()
        return
      }

      await Promise.all(registrations.map(registration => registration.unregister()))
      await clearCaches()

      if (navigator.serviceWorker.controller && !sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1')
        window.location.reload()
        return
      }

      sessionStorage.removeItem(reloadKey)
    })
    .catch(() => {})
})()`

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a1a' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  ...(config.pwa
    ? {
        appleWebApp: {
          capable: true,
          statusBarStyle: 'default',
          title: defaultTitle,
        },
      }
    : {}),
  formatDetection: {
    telephone: false,
  },
  title: {
    default: defaultTitle,
    template: enMessages.metadata.titleTemplate,
  },
  description: defaultDescription,
  keywords: metaKeywords.length > 0 ? metaKeywords : undefined,
  authors: seo.author ? [{ name: seo.author }] : undefined,
  creator: seo.author || undefined,
  openGraph: {
    type: 'website',
    siteName: defaultTitle,
    title: defaultTitle,
    description: defaultDescription,
    url: siteUrl,
    ...(resolvedOgImage ? { images: [{ url: resolvedOgImage, width: 1200, height: 630, alt: defaultTitle }] } : {}),
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    ...(resolvedOgImage ? { images: [resolvedOgImage] } : {}),
    ...(config.twitter ? { creator: `@${config.twitter}` } : {}),
  },
  alternates: {
    canonical: siteUrl,
    types: {
      'application/rss+xml': '/rss.xml',
    },
  },
  robots: {
    index: !seo.noIndex,
    follow: !seo.noFollow,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="dev-service-worker-cleanup" strategy="beforeInteractive">
          {devServiceWorkerCleanupScript}
        </Script>
        {config.pwa && <link rel="apple-touch-icon" href="/icon-192x192.png" />}
      </head>
      <body>
        <ServiceWorkerRegister enabled={config.pwa} />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Blog',
            'name': defaultTitle,
            'description': defaultDescription,
            'url': siteUrl,
            'author': {
              '@type': 'Person',
              'name': seo.author || 'Unknown',
            },
            ...(resolvedOgImage ? { image: resolvedOgImage } : {}),
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
