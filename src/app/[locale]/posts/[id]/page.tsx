import type { Metadata } from 'next'
import type { ChannelInfo, ChannelPost } from '@/lib/types'
import { notFound } from 'next/navigation'
import { FeedList } from '@/components/feed/feed-list'
import { JsonLd } from '@/components/site/json-ld'
import { PageFrame } from '@/components/site/page-frame'
import { buildStaticProxyUrl, getAppConfig } from '@/lib/config'
import { getLocaleMessages, normalizeAppLocale, SUPPORTED_LOCALES } from '@/lib/i18n'
import { resolveSeoImageUrl } from '@/lib/seo'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export const dynamic = 'force-static'
export const dynamicParams = false

interface PostPageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export async function generateStaticParams() {
  const snapshot = await getStaticSnapshot()
  return SUPPORTED_LOCALES.flatMap(locale =>
    snapshot.postIds.map(id => ({ locale, id })),
  )
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { locale: localeParam, id = '' } = (await params) ?? {}
  const locale = normalizeAppLocale(localeParam)
  const messages = getLocaleMessages(locale)
  const config = getAppConfig()
  const { seo } = config
  const snapshot = await getStaticSnapshot()
  const post = snapshot.pages
    .flatMap(page => page.channel.posts)
    .find(item => item.id === id)

  if (!post)
    return {}

  const postTitle = post.title || post.text?.slice(0, 80) || `Post ${id}`
  const postDescription = post.text?.slice(0, 160) || seo.description || messages.metadata.description
  const siteUrl = config.siteUrl || 'https://example.com'
  const resolvedOgImage = resolveSeoImageUrl(siteUrl, seo.ogImage)
  const postUrl = `${siteUrl}/${locale}/posts/${id}`

  return {
    title: postTitle,
    description: postDescription,
    openGraph: {
      type: 'article',
      title: postTitle,
      description: postDescription,
      url: postUrl,
      siteName: seo.ogSiteName || seo.title || messages.metadata.titleDefault,
      ...(post.datetime ? { publishedTime: post.datetime } : {}),
      ...(seo.author ? { authors: [seo.author] } : {}),
      ...(resolvedOgImage ? { images: [{ url: resolvedOgImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: postTitle,
      description: postDescription,
      ...(resolvedOgImage ? { images: [resolvedOgImage] } : {}),
      ...(seo.twitterCreator ? { creator: seo.twitterCreator } : {}),
      ...(seo.twitterSite ? { site: seo.twitterSite } : {}),
    },
    alternates: {
      canonical: postUrl,
    },
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { locale: localeParam, id = '' } = (await params) ?? {}
  const locale = normalizeAppLocale(localeParam)
  const messages = getLocaleMessages(locale)
  const config = getAppConfig()
  const snapshot = await getStaticSnapshot()
  const channelInfo = snapshot.root as ChannelInfo
  const post = snapshot.pages
    .flatMap(page => page.channel.posts)
    .find(item => item.id === id) as ChannelPost | undefined

  if (!post) {
    notFound()
  }

  const channel: ChannelInfo = {
    ...channelInfo,
    posts: [post],
  }
  const channelAvatar = channel.avatar?.startsWith('http')
    ? buildStaticProxyUrl(config.staticProxy, channel.avatar)
    : (channel.avatar || '/favicon.svg')
  const channelUsername = config.telegram || config.channel

  const siteUrl = config.siteUrl || 'https://example.com'
  const { seo } = config
  const resolvedOgImage = resolveSeoImageUrl(siteUrl, seo.ogImage)

  const blogPostingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'headline': post.title || post.text?.slice(0, 110) || `Post ${id}`,
    'datePublished': post.datetime || undefined,
    'dateModified': post.edited ? undefined : post.datetime || undefined,
    'url': `${siteUrl}/${locale}/posts/${id}`,
    'author': {
      '@type': 'Person',
      'name': seo.author || 'Unknown',
    },
    'publisher': {
      '@type': 'Organization',
      'name': seo.ogSiteName || 'Telecast',
      ...(resolvedOgImage ? { logo: { '@type': 'ImageObject', 'url': resolvedOgImage } } : {}),
    },
    ...(resolvedOgImage ? { image: resolvedOgImage } : {}),
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `${siteUrl}/${locale}/posts/${id}`,
    },
  }

  return (
    <PageFrame
      channel={channel}
      currentPath="/"
      locale={locale}
      messages={messages}
      currentLocalePath={`/posts/${id}`}
      showBack
    >
      <JsonLd data={blogPostingJsonLd} />
      <FeedList
        posts={channel.posts}
        locale={locale}
        timezone={config.timezone}
        channelName={config.channel}
        channelTitle={channel.title}
        channelUsername={channelUsername}
        channelAvatar={channelAvatar}
        commentsEnabled={config.commentsEnabled}
        showBefore={false}
        showAfter={false}
        showComments
        uiLocale={locale}
        messages={messages}
      />
    </PageFrame>
  )
}
