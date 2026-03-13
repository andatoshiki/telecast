import type { AnalyticsConfig, CloudFlareConfig, SeoConfig } from './constant'
import { SITE_CONSTANTS } from './constant'

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i

export interface AppConfig {
  channel: string
  locale: string
  timezone: string
  siteUrl: string
  staticProxy: string
  cloudFlare: CloudFlareConfig
  telegramHost: string
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
    cloudFlare: SITE_CONSTANTS.cloudFlare,
    telegramHost: SITE_CONSTANTS.telegramHost,
    hideDescription: SITE_CONSTANTS.hideDescription,
    reactionsEnabled: SITE_CONSTANTS.reactionsEnabled,
    website: SITE_CONSTANTS.website,
    twitter: SITE_CONSTANTS.twitter,
    github: SITE_CONSTANTS.github,
    telegram: SITE_CONSTANTS.telegram,
    mastodon: SITE_CONSTANTS.mastodon,
    bluesky: SITE_CONSTANTS.bluesky,
    customBanner: SITE_CONSTANTS.customBanner,
    customFooter: SITE_CONSTANTS.customFooter,
    rssBeautify: SITE_CONSTANTS.rssBeautify,
    seo: SITE_CONSTANTS.seo,
    analytics: SITE_CONSTANTS.analytics,
  }
}
