import type { ExternalLink, NavLink } from './types'

export interface StaticBuildConfig {
  maxPages: number
  devRefreshMinutes: number
}

export interface MediaMirrorConfig {
  directory: string
  userAgent: string
}

export interface GoogleBotConfig {
  'index': boolean
  'follow': boolean
  'max-video-preview': number
  'max-image-preview': 'none' | 'standard' | 'large'
  'max-snippet': number
}

export interface RobotsConfig {
  index: boolean
  follow: boolean
  googleBot: GoogleBotConfig
}

export interface SeoConfig {
  title: string
  description: string
  ogImage: string
  ogTitle: string
  ogDescription: string
  ogUrl: string
  ogSiteName: string
  twitterCard: 'summary' | 'summary_large_image'
  twitterCreator: string
  twitterSite: string
  keywords: string[]
  author: string
  canonical: string
  robots: RobotsConfig
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
  commentsEnabled: boolean
  reactionsEnabled: boolean
  noIndex: boolean
  noFollow: boolean
  website: string
  twitter: string
  github: string
  telegram: string
  mastodon: string
  bluesky: string
  tags: string[]
  links: ExternalLink[]
  navs: NavLink[]
  bannerHtml: string
  footerOverride: string
  rssBeautify: boolean
  seo: SeoConfig
  analytics: AnalyticsConfig
  imagekit: boolean
  staticBuild: StaticBuildConfig
  mediaMirror: MediaMirrorConfig
}

export const SITE_CONSTANTS: SiteConstantConfig = {
  channel: 'toshikidev',
  locale: 'en',
  timezone: 'UTC',
  siteUrl: 'https://tg.toshiki.dev',
  telegramHost: 't.me',
  // Keep empty unless you need a runtime proxy for Telegram-origin media URLs.
  staticProxy: '',
  hideDescription: false,
  commentsEnabled: false,
  reactionsEnabled: true,
  noIndex: false,
  noFollow: false,
  website: 'https://toshiki.dev',
  // Usernames only — no URL prefix needed
  twitter: 'andatoshiki',
  github: 'andatoshiki',
  telegram: 'toshikidev',
  mastodon: 'mastodon.social/@andatoshiki',
  bluesky: 'andatoshiki.bsky.social',
  tags: [],
  links: [],
  navs: [],
  bannerHtml: '',
  footerOverride: '',
  rssBeautify: true,
  seo: {
    title: 'Telecast – Anda Toshiki',
    description: 'Tech notes, development logs, and microblog posts by Anda Toshiki via Telegram!',
    ogImage: '/og-auto.png',
    ogTitle: 'Telecast – Anda Toshiki',
    ogDescription: 'Tech notes, development logs, and microblog posts by Anda Toshiki.',
    ogUrl: 'https://tg.toshiki.dev',
    ogSiteName: 'Telecast',
    twitterCard: 'summary_large_image',
    twitterCreator: '@andatoshiki',
    twitterSite: '@toshikidev',
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
    author: 'Anda Toshiki',
    canonical: 'https://tg.toshiki.dev',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        'index': true,
        'follow': true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  },
  analytics: {
    googleAnalyticsId: '',
    umamiScriptUrl: 'https://umami.toshiki.dev/script.js',
    umamiWebsiteId: '2aeae228-582d-45ae-8d43-5f6dbf673339',
  },
  imagekit: true,
  staticBuild: {
    maxPages: 50,
    devRefreshMinutes: 45,
  },
  mediaMirror: {
    directory: '/media',
    userAgent: 'TelecastStaticSync/1.0',
  },
}
