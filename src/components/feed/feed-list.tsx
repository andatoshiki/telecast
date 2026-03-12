import type { AppLocale } from '@/lib/i18n'
import type { ChannelPost } from '@/lib/types'
import type { LocaleMessages } from '@/locales/en'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { localizePath } from '@/lib/i18n'
import { PostCard } from './post-card'

interface FeedListProps {
  posts: ChannelPost[]
  locale: string
  timezone: string
  channelName: string
  channelTitle?: string
  channelUsername?: string
  channelAvatar?: string
  commentsEnabled: boolean
  showBefore?: boolean
  showAfter?: boolean
  showComments?: boolean
  olderHref?: string | null
  newerHref?: string | null
  uiLocale: AppLocale
  messages: LocaleMessages
}

export function FeedList({
  posts,
  locale,
  timezone,
  channelName,
  channelTitle,
  channelUsername,
  channelAvatar,
  commentsEnabled,
  showBefore = true,
  showAfter = true,
  showComments = false,
  olderHref,
  newerHref,
  uiLocale,
  messages,
}: FeedListProps) {
  const beforeCursor = posts[posts.length - 1]?.id
  const afterCursor = posts[0]?.id
  const resolvedOlderHref = olderHref === undefined
    ? ((showBefore && beforeCursor && Number(beforeCursor) > 1) ? localizePath(uiLocale, `/before/${beforeCursor}`) : null)
    : olderHref
  const resolvedNewerHref = newerHref === undefined
    ? ((showAfter && afterCursor) ? localizePath(uiLocale, `/after/${afterCursor}`) : null)
    : newerHref

  const hasPagination = !!(resolvedOlderHref || resolvedNewerHref)

  return (
    <div className={hasPagination ? undefined : '[&>article:last-child]:border-b-0'}>
      {posts.map((post, index) => (
        <PostCard
          key={post.id}
          post={post}
          index={index}
          locale={locale}
          timezone={timezone}
          channelTitle={channelTitle}
          channelUsername={channelUsername}
          channelAvatar={channelAvatar}
          showComments={commentsEnabled && showComments}
          channelName={channelName}
          uiLocale={uiLocale}
          messages={messages}
        />
      ))}

      {(resolvedOlderHref || resolvedNewerHref) && (
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          {resolvedOlderHref
            ? (
                <Button asChild variant="outline" className="rounded-full">
                  <Link href={resolvedOlderHref} prefetch>
                    <ArrowLeft className="h-4 w-4" />
                    {messages.feed.older}
                  </Link>
                </Button>
              )
            : <span />}

          {resolvedNewerHref
            ? (
                <Button asChild variant="outline" className="rounded-full">
                  <Link href={resolvedNewerHref} prefetch>
                    {messages.feed.newer}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )
            : null}
        </div>
      )}
    </div>
  )
}
