import type { ChannelInfo } from '@/lib/types'
import { FeedList } from '@/components/feed/feed-list'
import { PageFrame } from '@/components/site/page-frame'
import { buildStaticProxyUrl, getAppConfig } from '@/lib/config'
import { getLocaleMessages, normalizeAppLocale } from '@/lib/i18n'
import { getSnapshotPaginationLinks } from '@/lib/pagination/snapshot-pagination'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export const dynamic = 'force-static'

interface HomePageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: localeParam } = (await params) ?? {}
  const locale = normalizeAppLocale(localeParam)
  const messages = getLocaleMessages(locale)
  const config = getAppConfig()
  const snapshot = await getStaticSnapshot()
  const channel = snapshot.root as ChannelInfo
  const { olderHref } = getSnapshotPaginationLinks(snapshot.pages, 0, locale)
  const channelAvatar = channel.avatar?.startsWith('http')
    ? buildStaticProxyUrl(config.staticProxy, channel.avatar)
    : (channel.avatar || '/favicon.svg')
  const channelUsername = config.telegram || config.channel

  return (
    <PageFrame channel={channel} currentPath="/" locale={locale} messages={messages} currentLocalePath="/" pageNumber={1}>
      <FeedList
        posts={channel.posts}
        locale={locale}
        timezone={config.timezone}
        channelName={config.channel}
        channelTitle={channel.title}
        channelUsername={channelUsername}
        channelAvatar={channelAvatar}
        commentsEnabled={config.commentsEnabled}
        olderHref={olderHref}
        newerHref={null}
        uiLocale={locale}
        messages={messages}
      />
    </PageFrame>
  )
}
