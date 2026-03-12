import type { AppLocale } from '@/lib/i18n'
import type { ChannelInfo } from '@/lib/types'
import { redirect } from 'next/navigation'
import { FeedList } from '@/components/feed/feed-list'
import { PageFrame } from '@/components/site/page-frame'
import { buildStaticProxyUrl, getAppConfig } from '@/lib/config'
import { getLocaleMessages, localizePath } from '@/lib/i18n'
import {
  getSnapshotPageIndexByBeforeCursor,
  getSnapshotPaginationLinks,
} from '@/lib/pagination/snapshot-pagination'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export async function renderBeforePage(locale: AppLocale, cursor: string) {
  const messages = getLocaleMessages(locale)
  const config = getAppConfig()
  const snapshot = await getStaticSnapshot()
  const pageIndex = getSnapshotPageIndexByBeforeCursor(snapshot.pages, cursor)

  if (pageIndex < 0) {
    redirect(localizePath(locale, '/'))
  }

  const channel = snapshot.pages[pageIndex]?.channel as ChannelInfo
  const { olderHref, newerHref } = getSnapshotPaginationLinks(snapshot.pages, pageIndex, locale)
  const channelAvatar = channel.avatar?.startsWith('http')
    ? buildStaticProxyUrl(config.staticProxy, channel.avatar)
    : (channel.avatar || '/favicon.svg')
  const channelUsername = config.telegram || config.channel

  return (
    <PageFrame
      channel={channel}
      currentPath="/"
      locale={locale}
      messages={messages}
      currentLocalePath={`/before/${cursor}`}
      pageNumber={pageIndex + 1}
    >
      <FeedList
        posts={channel.posts}
        locale={locale}
        timezone={config.timezone}
        channelName={config.channel}
        channelTitle={channel.title}
        channelUsername={channelUsername}
        channelAvatar={channelAvatar}
        olderHref={olderHref}
        newerHref={newerHref}
        uiLocale={locale}
        messages={messages}
      />
    </PageFrame>
  )
}
