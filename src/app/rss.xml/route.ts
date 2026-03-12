import type { ChannelInfo } from '@/lib/types'
import { getAppConfig } from '@/lib/config'
import { DEFAULT_LOCALE, localizePath } from '@/lib/i18n'
import { escapeXml } from '@/lib/sanitize'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export const dynamic = 'force-static'

export async function GET() {
  const config = getAppConfig()
  const snapshot = await getStaticSnapshot()
  const channel = snapshot.root as ChannelInfo
  const siteUrl = config.siteUrl || 'https://example.com'

  const itemsXml = channel.posts.map((post) => {
    const content = (post.content || '').replaceAll(']]>', ']]]]><![CDATA[>')
    const postUrl = `${siteUrl}${localizePath(DEFAULT_LOCALE, `/posts/${post.id}`)}`
    return `
      <item>
        <guid>${escapeXml(postUrl)}</guid>
        <link>${escapeXml(postUrl)}</link>
        <title>${escapeXml(post.title || `Post ${post.id}`)}</title>
        <pubDate>${new Date(post.datetime).toUTCString()}</pubDate>
        <description><![CDATA[${content}]]></description>
      </item>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <description>${escapeXml(channel.description || channel.title)}</description>
    <link>${escapeXml(`${siteUrl}${localizePath(DEFAULT_LOCALE, '/')}`)}</link>${itemsXml}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
