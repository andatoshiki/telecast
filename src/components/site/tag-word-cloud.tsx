'use client'

import type { CSSProperties } from 'react'
import type { AppLocale } from '@/lib/i18n'
import { motion } from 'motion/react'
import { localizePath } from '@/lib/i18n'

export interface TagCloudEntry {
  tag: string
  count: number
}

interface TagWordCloudProps {
  entries: TagCloudEntry[]
  locale: AppLocale
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      duration: 0.2,
      staggerChildren: 0.03,
      delayChildren: 0.02,
    },
  },
}

const tagItemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.92, filter: 'blur(3px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 28,
    },
  },
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
    <motion.div
      className="tag-cloud"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
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
          <motion.a
            key={entry.tag}
            href={localizePath(locale, `/search?q=${encodeURIComponent(`#${entry.tag}`)}`)}
            className="tag-cloud-item"
            style={style}
            variants={tagItemVariants}
          >
            <span className="tag-cloud-label">
              #
              {' '}
              {entry.tag}
            </span>
            <span className="tag-cloud-count" aria-hidden>{entry.count}</span>
          </motion.a>
        )
      })}
    </motion.div>
  )
}
