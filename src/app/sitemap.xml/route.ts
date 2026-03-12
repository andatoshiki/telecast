import { getAppConfig } from '@/lib/config'
import { localizePath, SUPPORTED_LOCALES } from '@/lib/i18n'
import { escapeXml } from '@/lib/sanitize'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export const dynamic = 'force-static'

export async function GET() {
  const config = getAppConfig()
  const snapshot = await getStaticSnapshot()
  const siteUrl = config.siteUrl || 'https://example.com'

  const allPosts = snapshot.pages.flatMap(page => page.channel.posts)
  const localizedHomes = SUPPORTED_LOCALES.map(locale => `${siteUrl}${localizePath(locale, '/')}`)
  const localizedTags = SUPPORTED_LOCALES.map(locale => `${siteUrl}${localizePath(locale, '/tags')}`)
  const localizedLinks = SUPPORTED_LOCALES.map(locale => `${siteUrl}${localizePath(locale, '/links')}`)
  const localizedPostUrls = SUPPORTED_LOCALES.flatMap(locale =>
    allPosts.map(post => ({
      url: `${siteUrl}${localizePath(locale, `/posts/${post.id}`)}`,
      datetime: post.datetime,
    })),
  )

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${localizedHomes.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}
${localizedPostUrls.map(post => `  <url><loc>${escapeXml(post.url)}</loc><lastmod>${new Date(post.datetime).toISOString()}</lastmod></url>`).join('\n')}
  <url><loc>${escapeXml(`${siteUrl}/rss.xml`)}</loc></url>
  <url><loc>${escapeXml(`${siteUrl}/rss.json`)}</loc></url>
${localizedTags.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}
${localizedLinks.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
