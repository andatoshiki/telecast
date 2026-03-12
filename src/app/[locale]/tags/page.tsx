import type { ChannelInfo } from '@/lib/types'
import { redirect } from 'next/navigation'
import { PageFrame } from '@/components/site/page-frame'
import { TagWordCloud } from '@/components/site/tag-word-cloud'
import { getAppConfig } from '@/lib/config'
import { getLocaleMessages, localizePath, normalizeAppLocale } from '@/lib/i18n'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export const dynamic = 'force-static'

interface TagsPageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function TagsPage({ params }: TagsPageProps) {
  const { locale: localeParam } = (await params) ?? {}
  const locale = normalizeAppLocale(localeParam)
  const messages = getLocaleMessages(locale)
  const config = getAppConfig()
  const snapshot = await getStaticSnapshot()
  const channel = snapshot.root as ChannelInfo
  const tagFrequency = new Map<string, number>()
  const seenPostIds = new Set<string>()

  for (const page of snapshot.pages) {
    for (const post of page.channel.posts) {
      if (!post.id || seenPostIds.has(post.id)) {
        continue
      }

      seenPostIds.add(post.id)

      for (const tag of post.tags) {
        const normalizedTag = tag.trim()
        if (!normalizedTag) {
          continue
        }

        tagFrequency.set(normalizedTag, (tagFrequency.get(normalizedTag) || 0) + 1)
      }
    }
  }

  for (const tag of config.tags) {
    const normalizedTag = tag.trim()
    if (!normalizedTag || tagFrequency.has(normalizedTag)) {
      continue
    }

    tagFrequency.set(normalizedTag, 1)
  }

  const cloudEntries = Array.from(tagFrequency.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag))

  if (cloudEntries.length === 0) {
    redirect(localizePath(locale, '/'))
  }

  return (
    <PageFrame channel={channel} currentPath="/tags" locale={locale} messages={messages} currentLocalePath="/tags">
      <div className="px-4 py-6">
        <TagWordCloud entries={cloudEntries} locale={locale} />
      </div>
    </PageFrame>
  )
}
