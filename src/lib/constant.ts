export interface MediaMirrorConfig {
  directory: string
  userAgent: string
}

export interface SeoConfig {
  title: string
  description: string
  ogImage: string
  keywords: string[]
  author: string
  noIndex: boolean
  noFollow: boolean
}

export interface AnalyticsConfig {
  googleAnalyticsId: string
  umamiScriptUrl: string
  umamiWebsiteId: string
}

export interface SiteConstantConfig {
  channel: string
  locale: string
  timezone: string
  siteUrl: string
  telegramHost: string
  staticProxy: string
  hideDescription: boolean
  reactionsEnabled: boolean
  website: string
  twitter: string
  github: string
  telegram: string
  mastodon: string
  bluesky: string
  customBanner: string
  customFooter: string
  rssBeautify: boolean
  seo: SeoConfig
  analytics: AnalyticsConfig
  maxPages: number
  mediaMirror: MediaMirrorConfig
}

export const SITE_CONSTANTS: SiteConstantConfig = {
  // Telegram channel username (without @) to mirror content from.
  channel: 'toshikidev',
  // Default locale for the site (e.g. en, ja, zh).
  locale: 'en',
  // Timezone for date formatting (e.g. UTC, America/New_York).
  timezone: 'UTC',
  // Canonical base URL of the published site.
  siteUrl: 'https://tg.toshiki.dev',
  // Telegram host used for channel fetches and public links (e.g. t.me).
  telegramHost: 't.me',
  // Proxy base URL for Telegram-origin media. Leave empty unless you need a runtime proxy.
  staticProxy: '',
  // Whether to hide the channel description on the site.
  hideDescription: false,
  // Whether to show Telegram-style reactions on posts.
  reactionsEnabled: true,
  // Main website URL for the author/org.
  website: 'https://toshiki.dev',
  // Twitter/X username only (no URL prefix).
  twitter: 'andatoshiki',
  // GitHub username only (no URL prefix).
  github: 'andatoshiki',
  // Telegram username only (no URL prefix).
  telegram: 'toshikidev',
  // Mastodon profile host/path without protocol (e.g. mastodon.social/@username).
  mastodon: 'mastodon.social/@andatoshiki',
  // Bluesky handle (e.g. username.bsky.social).
  bluesky: 'andatoshiki.bsky.social',
  // Optional inline markdown shown above main content (e.g. **alert**, [link](https://...)).
  customBanner: '**Open source under AGPL-3.0.** [Get Telecast on GitHub](https://github.com/andatohsiki/telecast) and launch your own instance in minutes with minimal configuration!',
  // Optional inline markdown to replace the default footer.
  customFooter: '',
  // Whether to beautify RSS output with XSLT styling.
  rssBeautify: true,
  seo: {
    // Site title shown in browser tab and search results.
    title: 'Telecast – Anda Toshiki',
    // Meta description for search engines and social previews.
    description: 'Tech notes, development logs, and microblog posts by Anda Toshiki via Telegram!',
    // Open Graph image path for social sharing (e.g. /og-auto.png).
    ogImage: '/og-auto.png',
    // SEO keywords for meta tags.
    keywords: [
      'telecast',
      'toshikidev',
      'anda toshiki',
      'telegram channel',
      'microblog',
      'developer blog',
      'tech updates',
      'programming',
      'open source',
      'web development',
    ],
    // Author name for meta tags and attribution.
    author: 'Anda Toshiki',
    // Whether to emit robots noindex for the site.
    noIndex: false,
    // Whether to emit robots nofollow for the site.
    noFollow: false,
  },
  analytics: {
    // Google Analytics 4 measurement ID (e.g. G-XXXXXXXXXX). Leave empty to disable.
    googleAnalyticsId: '',
    // Umami analytics script URL. Leave empty to disable.
    umamiScriptUrl: 'https://umami.toshiki.dev/script.js',
    // Umami website ID for this site.
    umamiWebsiteId: '2aeae228-582d-45ae-8d43-5f6dbf673339',
  },
  // Maximum Telegram snapshot pages to fetch during static sync.
  maxPages: 50,
  mediaMirror: {
    // Public URL prefix for mirrored media (e.g. /media => files under public/media).
    directory: '/media',
    // User-Agent string used when fetching media from Telegram.
    userAgent: 'TelecastStaticSync/1.0',
  },
}
