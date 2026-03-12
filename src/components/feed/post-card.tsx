import type { AppLocale } from '@/lib/i18n'
import type { ChannelPost } from '@/lib/types'
import type { LocaleMessages } from '@/locales/en'
import { Eye, Tag } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { localizePath } from '@/lib/i18n'
import { formatPostTimestamp } from '@/lib/time'
import { AnimatedMetricNumber } from './animated-metric-number'

interface PostCardProps {
  post: ChannelPost
  index: number
  locale: string
  timezone: string
  channelTitle?: string
  channelUsername?: string
  channelAvatar?: string
  channelName?: string
  uiLocale: AppLocale
  messages: LocaleMessages
}

export function PostCard({
  post,
  index,
  locale,
  timezone,
  channelTitle = '',
  channelUsername = '',
  channelAvatar = '',
  channelName = '',
  uiLocale,
  messages,
}: PostCardProps) {
  const delay = Math.min(index * 45, 270)
  const formattedTime = formatPostTimestamp(post.datetime, locale, timezone)
  const displayName = channelTitle.trim() || channelName
  const username = (channelUsername || channelName).replace(/^@/, '').trim()
  const avatarSrc = channelAvatar?.trim() || '/favicon.svg'
  const avatarAlt = displayName
    ? `${displayName}${messages.feed.avatarSuffix}`
    : messages.feed.channelAvatarAlt

  return (
    <article
      className="group-post animate-fade-up border-b px-4 py-4 transition-colors hover:bg-muted/30"
      style={{ animationDelay: `${delay}ms` }}
      data-twemoji-scope
    >
      <div className="flex items-stretch gap-3">
        <div className="relative w-11 shrink-0">
          <img
            src={avatarSrc}
            alt={avatarAlt}
            className="relative z-[1] h-11 w-11 rounded-full border object-cover"
            loading={index < 2 ? 'eager' : 'lazy'}
          />
          <span
            aria-hidden
            className="avatar-rail pointer-events-none absolute bottom-0 left-1/2 top-[50px] -translate-x-1/2"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
            {displayName
              ? <span className="truncate font-semibold text-foreground">{displayName}</span>
              : null}

            {username
              ? (
                  <span className="truncate text-muted-foreground">
                    @
                    {username}
                  </span>
                )
              : null}

            {displayName || username
              ? <span className="text-muted-foreground">·</span>
              : null}

            <Link href={localizePath(uiLocale, `/posts/${post.id}`)} className="link-smooth text-muted-foreground" prefetch>
              <time dateTime={post.datetime} title={post.datetime}>
                {formattedTime || post.datetime}
              </time>
            </Link>

          </div>

          {post.content
            ? <div className="prose-telegram" dangerouslySetInnerHTML={{ __html: post.content }} />
            : null}

          {post.tags.length > 0
            ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {post.tags.map(tag => (
                    <Link key={`${post.id}-${tag}`} href={localizePath(uiLocale, `/search?q=${encodeURIComponent(`#${tag}`)}`)} prefetch>
                      <Badge variant="outline" className="cursor-pointer rounded-full px-3 hover:bg-secondary">
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )
            : null}

          {post.reactions.length > 0 || post.views || post.edited
            ? (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2" aria-label={messages.feed.reactionsAndViewsAria}>
                  {post.reactions.map(reaction => (
                    <span
                      key={`${post.id}-${reaction.emojiId || reaction.emoji}-${reaction.count}`}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-semibold ${reaction.isPaid
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-muted text-muted-foreground'}`}
                    >
                      {reaction.emojiImage
                        ? <img src={reaction.emojiImage} alt={reaction.emoji || messages.feed.emojiAlt} className="h-3.5 w-3.5" loading="lazy" />
                        : <span>{reaction.emoji || '⭐'}</span>}
                      <AnimatedMetricNumber value={reaction.count} />
                    </span>
                  ))}

                  {post.edited
                    ? (
                        <span className="inline-flex items-center rounded-full border bg-muted px-3 py-0.5 text-xs font-semibold text-muted-foreground">
                          {messages.feed.edited}
                        </span>
                      )
                    : null}

                  {post.views
                    ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border bg-muted px-3 py-0.5 text-xs font-semibold text-muted-foreground"
                          title={messages.feed.viewCountTitle}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <AnimatedMetricNumber value={post.views} />
                        </span>
                      )
                    : null}
                </div>
              )
            : null}

        </div>
      </div>
    </article>
  )
}
