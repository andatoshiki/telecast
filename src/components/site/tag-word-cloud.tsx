import type { CSSProperties } from 'react'
import type { AppLocale } from '@/lib/i18n'
import Link from 'next/link'
import { localizePath } from '@/lib/i18n'

export interface TagCloudEntry {
  tag: string
  count: number
}

interface TagWordCloudProps {
  entries: TagCloudEntry[]
  locale: AppLocale
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function TagWordCloud({ entries, locale }: TagWordCloudProps) {
  if (entries.length === 0) {
    return null
  }

  const minCount = Math.min(...entries.map(entry => entry.count))
  const maxCount = Math.max(...entries.map(entry => entry.count))
  const range = Math.max(1, maxCount - minCount)

  return (
    <div className="tag-cloud">
      {entries.map((entry, index) => {
        const normalizedWeight = (entry.count - minCount) / range
        const size = 0.9 + normalizedWeight * 1.2
        const opacity = 0.62 + normalizedWeight * 0.38
        const rotate = index % 13 === 0
          ? -8
          : index % 9 === 0
            ? 7
            : index % 7 === 0
              ? -5
              : 0

        const style = {
          '--tag-size': `${clamp(size, 0.88, 2.1)}rem`,
          '--tag-opacity': clamp(opacity, 0.6, 1).toFixed(3),
          '--tag-rotate': `${rotate}deg`,
        } as CSSProperties

        return (
          <Link
            key={entry.tag}
            href={localizePath(locale, `/search?q=${encodeURIComponent(`#${entry.tag}`)}`)}
            className="tag-cloud-item"
            style={style}
            prefetch
          >
            <span className="tag-cloud-label">
              #
              {' '}
              {entry.tag}
            </span>
            <span className="tag-cloud-count" aria-hidden>{entry.count}</span>
          </Link>
        )
      })}
    </div>
  )
}
