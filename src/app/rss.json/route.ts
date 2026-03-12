import type { ChannelInfo } from '@/lib/types'
import { getAppConfig } from '@/lib/config'
import { DEFAULT_LOCALE, localizePath } from '@/lib/i18n'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export const dynamic = 'force-static'

export async function GET() {
  const config = getAppConfig()
  const snapshot = await getStaticSnapshot()
  const channel = snapshot.root as ChannelInfo
  const siteUrl = config.siteUrl || 'https://example.com'

  return Response.json({
    version: 'https://jsonfeed.org/version/1.1',
    title: channel.title,
    description: channel.description,
    home_page_url: `${siteUrl}${localizePath(DEFAULT_LOCALE, '/')}`,
    feed_url: `${siteUrl}/rss.json`,
    items: channel.posts.map(post => ({
      id: `${siteUrl}${localizePath(DEFAULT_LOCALE, `/posts/${post.id}`)}`,
      url: `${siteUrl}${localizePath(DEFAULT_LOCALE, `/posts/${post.id}`)}`,
      title: post.title,
      content_html: post.content,
      tags: post.tags,
      date_published: new Date(post.datetime).toISOString(),
    })),
  }, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
