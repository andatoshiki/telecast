import type { AnalyticsConfig, SeoConfig } from './constant'
import type { ExternalLink, NavLink } from './types'
import { SITE_CONSTANTS } from './constant'

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i

export interface AppConfig {
  channel: string
  locale: string
  timezone: string
  siteUrl: string
  staticProxy: string
  telegramHost: string
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
}

export function safeDecodeURIComponent(input: string) {
  try {
    return decodeURIComponent(input)
  }
  catch {
    return input
  }
}

export function getBaseSiteUrl(origin: string) {
  const configuredSite = SITE_CONSTANTS.siteUrl
  if (configuredSite.startsWith('http://') || configuredSite.startsWith('https://')) {
    try {
      return new URL(configuredSite).origin
    }
    catch {
      return origin
    }
  }

  return origin
}

export function buildStaticProxyUrl(staticProxy: string, rawUrl: string) {
  const input = rawUrl.trim()
  if (!input || !staticProxy) {
    return input
  }

  if (input.startsWith(staticProxy)) {
    return input
  }

  const normalizedProxy = staticProxy.endsWith('/') ? staticProxy : `${staticProxy}/`

  let target = input
  if (target.startsWith('//')) {
    target = `https:${target}`
  }

  if (normalizedProxy.startsWith('/')) {
    return `${normalizedProxy}${encodeURIComponent(target)}`
  }

  if (target.startsWith('/')) {
    target = target.slice(1)
  }

  return `${normalizedProxy}${target}`
}

function normalizeStaticProxy(value: string) {
  const normalized = value.trim()
  if (!normalized) {
    return ''
  }

  if (ABSOLUTE_URL_PATTERN.test(normalized) || normalized.startsWith('/')) {
    return normalized
  }

  return ''
}

export function getAppConfig(): AppConfig {
  return {
    channel: SITE_CONSTANTS.channel,
    locale: SITE_CONSTANTS.locale,
    timezone: SITE_CONSTANTS.timezone,
    siteUrl: SITE_CONSTANTS.siteUrl,
    staticProxy: normalizeStaticProxy(SITE_CONSTANTS.staticProxy),
    telegramHost: SITE_CONSTANTS.telegramHost,
    hideDescription: SITE_CONSTANTS.hideDescription,
    commentsEnabled: SITE_CONSTANTS.commentsEnabled,
    reactionsEnabled: SITE_CONSTANTS.reactionsEnabled,
    noIndex: SITE_CONSTANTS.noIndex,
    noFollow: SITE_CONSTANTS.noFollow,
    website: SITE_CONSTANTS.website,
    twitter: SITE_CONSTANTS.twitter,
    github: SITE_CONSTANTS.github,
    telegram: SITE_CONSTANTS.telegram,
    mastodon: SITE_CONSTANTS.mastodon,
    bluesky: SITE_CONSTANTS.bluesky,
    tags: SITE_CONSTANTS.tags,
    links: SITE_CONSTANTS.links,
    navs: SITE_CONSTANTS.navs,
    bannerHtml: SITE_CONSTANTS.bannerHtml,
    footerOverride: SITE_CONSTANTS.footerOverride,
    rssBeautify: SITE_CONSTANTS.rssBeautify,
    seo: SITE_CONSTANTS.seo,
    analytics: SITE_CONSTANTS.analytics,
  }
}
