import type { MetadataRoute } from 'next'
import { getAppConfig } from '@/lib/config'
import { enMessages } from '@/locales/en'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  const config = getAppConfig()
  const { seo } = config

  // When PWA is disabled, return a minimal manifest (no display/icons/start_url)
  // so browsers won't treat the site as installable.
  if (!config.pwa) {
    return {
      name: seo.title || enMessages.metadata.titleDefault,
      description: seo.description || enMessages.metadata.description,
    }
  }

  return {
    name: seo.title || enMessages.metadata.titleDefault,
    short_name: config.channel || 'Telecast',
    description: seo.description || enMessages.metadata.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0a0a1a',
    orientation: 'portrait-primary',
    categories: ['blog', 'news', 'social'],
    icons: [
      {
        src: '/favicon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
      },
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
