import type { MetadataRoute } from 'next'
import { getAppConfig } from '@/lib/config'
import { SUPPORTED_LOCALES } from '@/lib/i18n'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = getAppConfig()
  const siteUrl = config.siteUrl || 'https://example.com'
  const snapshot = await getStaticSnapshot()

  const staticRoutes = SUPPORTED_LOCALES.flatMap(locale =>
    ['', '/tags', '/links', '/search'].map(path => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: path === '' ? 1.0 : 0.7,
    })),
  )

  const postRoutes = SUPPORTED_LOCALES.flatMap(locale =>
    snapshot.postIds.map((id) => {
      const post = snapshot.pages
        .flatMap(page => page.channel.posts)
        .find(item => item.id === id)

      return {
        url: `${siteUrl}/${locale}/posts/${id}`,
        lastModified: post?.datetime ? new Date(post.datetime) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }
    }),
  )

  const paginationRoutes = SUPPORTED_LOCALES.flatMap(locale =>
    snapshot.beforeCursors.map(cursor => ({
      url: `${siteUrl}/${locale}/before/${cursor}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.5,
    })),
  )

  return [...staticRoutes, ...postRoutes, ...paginationRoutes]
}
