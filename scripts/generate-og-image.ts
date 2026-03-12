import type { ChannelInfo } from '../src/lib/types'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const OG_WIDTH = 1200
const OG_HEIGHT = 630
const OUTPUT_RELATIVE_PATH = 'public/og-auto.svg'
const CARD_X = 40
const CARD_Y = 40
const CARD_WIDTH = 1120
const CARD_HEIGHT = 550

const SHADCN_COLORS = {
  background: '#ffffff',
  foreground: '#09090b',
  mutedForeground: '#71717a',
  border: '#e4e4e7',
  chipBackground: '#f4f4f5',
  chipText: '#3f3f46',
  avatarFallback: '#f4f4f5',
}
const APPLE_SF_FONT_STACK = '\'SF Pro Display\', \'SF Pro Text\', -apple-system, BlinkMacSystemFont, \'Helvetica Neue\', sans-serif'

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

function stripTags(input: string) {
  return input.replace(/<[^>]*>/g, ' ')
}

function normalizeText(input: string) {
  return input
    .replace(/\s+/g, ' ')
    .trim()
}

function chunkWord(word: string, limit: number) {
  const pieces: string[] = []
  for (let index = 0; index < word.length; index += limit) {
    pieces.push(word.slice(index, index + limit))
  }
  return pieces
}

function wrapText(input: string, maxCharsPerLine: number, maxLines: number) {
  const normalized = normalizeText(input)
  if (!normalized) {
    return []
  }

  const words = normalized
    .split(' ')
    .flatMap(word => word.length > maxCharsPerLine ? chunkWord(word, maxCharsPerLine) : [word])

  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if (!currentLine) {
      currentLine = word
      continue
    }

    const nextLine = `${currentLine} ${word}`
    if (nextLine.length <= maxCharsPerLine) {
      currentLine = nextLine
      continue
    }

    lines.push(currentLine)
    currentLine = word

    if (lines.length >= maxLines) {
      break
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine)
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines)
  }

  return lines
}

function truncateWithEllipsis(input: string, maxChars: number) {
  if (input.length <= maxChars) {
    return input
  }

  return `${input.slice(0, Math.max(0, maxChars - 1))}…`
}

function collectTopTags(channel: ChannelInfo, maxTags = 14) {
  const frequency = new Map<string, number>()

  for (const post of channel.posts) {
    for (const rawTag of post.tags) {
      const normalized = normalizeText(rawTag).replace(/^#/, '').toLowerCase()
      if (!normalized) {
        continue
      }

      frequency.set(normalized, (frequency.get(normalized) || 0) + 1)
    }
  }

  const sorted = [...frequency.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([tag]) => tag)

  const fallbackTags = [
    'telegram',
    'updates',
    'microblog',
    'channel',
    'search',
    'rss',
    'nextjs',
    'shadcn',
  ]

  const tags: string[] = []
  const seen = new Set<string>()

  for (const tag of [...sorted, ...fallbackTags]) {
    if (seen.has(tag)) {
      continue
    }

    seen.add(tag)
    tags.push(tag)
    if (tags.length >= maxTags) {
      break
    }
  }

  return tags
}

function buildTagChipSvg(args: {
  tags: string[]
  startX: number
  startY: number
  width: number
  maxRows: number
}) {
  const { tags, startX, startY, width, maxRows } = args
  const chipHeight = 40
  const rowGap = 10
  const colGap = 10
  const chipHorizontalPadding = 16
  const minChipWidth = 82
  const maxChipWidth = 250
  const maxX = startX + Math.max(120, width)
  const rowsLimit = Math.max(1, maxRows)

  let row = 0
  let cursorX = startX
  let cursorY = startY
  let chipsRendered = 0
  const elements: string[] = []

  for (const rawTag of tags) {
    const normalizedTag = normalizeText(rawTag).replace(/^#/, '')
    if (!normalizedTag) {
      continue
    }

    const safeTag = escapeXml(truncateWithEllipsis(normalizedTag, 18))
    const estimatedWidth = Math.min(
      maxChipWidth,
      Math.max(minChipWidth, (safeTag.length * 14) + (chipHorizontalPadding * 2)),
    )

    if (cursorX > startX && cursorX + estimatedWidth > maxX) {
      row += 1
      if (row >= rowsLimit) {
        break
      }
      cursorX = startX
      cursorY += chipHeight + rowGap
    }

    elements.push(
      `<rect x="${cursorX}" y="${cursorY}" width="${estimatedWidth}" height="${chipHeight}" rx="20" fill="${SHADCN_COLORS.chipBackground}" stroke="${SHADCN_COLORS.border}" />`,
      `<text x="${cursorX + Math.round(estimatedWidth / 2)}" y="${cursorY + Math.round(chipHeight / 2)}" text-anchor="middle" dominant-baseline="middle" fill="${SHADCN_COLORS.chipText}" font-size="24" font-weight="500" font-family="${APPLE_SF_FONT_STACK}">${safeTag}</text>`,
    )

    chipsRendered += 1
    cursorX += estimatedWidth + colGap
  }

  const rowsUsed = chipsRendered > 0 ? row + 1 : 0
  const height = rowsUsed > 0
    ? (rowsUsed * chipHeight) + ((rowsUsed - 1) * rowGap)
    : 0

  return {
    svg: elements.join('\n  '),
    height,
  }
}

async function getAvatarHref(avatar: string) {
  const trimmed = avatar.trim()
  if (!trimmed) {
    return ''
  }

  if (trimmed.startsWith('data:image/')) {
    return trimmed
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  if (!trimmed.startsWith('/')) {
    return ''
  }

  const absolutePath = path.resolve(process.cwd(), 'public', trimmed.slice(1))
  try {
    const bytes = await readFile(absolutePath)
    const extension = path.extname(absolutePath).toLowerCase()
    const mime = MIME_BY_EXTENSION[extension]
    if (!mime) {
      return ''
    }

    const encoded = bytes.toString('base64')
    return `data:${mime};base64,${encoded}`
  }
  catch {
    return ''
  }
}

function buildSvg(args: {
  title: string
  description: string
  avatarHref: string
  tags: string[]
}) {
  const { title, description, avatarHref, tags } = args
  const hasAvatar = Boolean(avatarHref)
  const contentHorizontalPadding = 56
  const avatarSize = 168
  const avatarGap = 44
  const tagsGapFromMain = 32
  const maxTagRows = 3
  const textColumnWidth = Math.min(
    620,
    CARD_WIDTH - (contentHorizontalPadding * 2) - avatarSize - avatarGap,
  )
  const contentWidth = avatarSize + avatarGap + textColumnWidth
  const contentLeftX = CARD_X + Math.round((CARD_WIDTH - contentWidth) / 2)
  const avatarX = contentLeftX
  const avatarRadius = avatarSize / 2
  const textStartX = avatarX + avatarSize + avatarGap
  const titleCharsPerLine = Math.max(16, Math.floor(textColumnWidth / 28))
  const descriptionCharsPerLine = Math.max(30, Math.floor(textColumnWidth / 15))
  const titleLineHeight = 68
  const titleLines = wrapText(title, titleCharsPerLine, 2)
    .map(line => truncateWithEllipsis(line, 64))
  const titleHeight = Math.max(1, titleLines.length) * titleLineHeight
  const descriptionLineHeight = 40
  const descriptionLines = wrapText(description, descriptionCharsPerLine, 3)
    .map(line => truncateWithEllipsis(line, 140))
  const descriptionHeight = Math.max(1, descriptionLines.length) * descriptionLineHeight
  const textBlockHeight = titleHeight + 24 + descriptionHeight
  const mainContentHeight = Math.max(avatarSize, textBlockHeight)
  const measuredTags = buildTagChipSvg({
    tags,
    startX: 0,
    startY: 0,
    width: contentWidth,
    maxRows: maxTagRows,
  })
  const overallBlockHeight = measuredTags.height > 0
    ? mainContentHeight + tagsGapFromMain + measuredTags.height
    : mainContentHeight
  const blockTopY = CARD_Y + Math.round((CARD_HEIGHT - overallBlockHeight) / 2)
  const avatarY = blockTopY
  const avatarCenterX = avatarX + avatarRadius
  const avatarCenterY = avatarY + avatarRadius
  const titleTopY = blockTopY
  const descriptionStartY = titleTopY + titleHeight + 24
  const tagsTopY = blockTopY + mainContentHeight + tagsGapFromMain
  const tagsStartX = contentLeftX
  const tagsWidth = contentWidth

  const safeTitleLines = titleLines.map(line => escapeXml(line))
  const safeDescriptionLines = descriptionLines.map(line => escapeXml(line))
  const safeAvatarHref = escapeXml(avatarHref)

  const titleTspans = safeTitleLines
    .map((line, index) => `<tspan x="${textStartX}" y="${titleTopY + (index * titleLineHeight)}">${line}</tspan>`)
    .join('')

  const descriptionTspans = safeDescriptionLines
    .map((line, index) => `<tspan x="${textStartX}" y="${descriptionStartY + (index * descriptionLineHeight)}">${line}</tspan>`)
    .join('')
  const tagChips = buildTagChipSvg({
    tags,
    startX: tagsStartX,
    startY: tagsTopY,
    width: tagsWidth,
    maxRows: maxTagRows,
  }).svg

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>
    <clipPath id="avatarClip">
      <circle cx="${avatarCenterX}" cy="${avatarCenterY}" r="${avatarRadius - 4}" />
    </clipPath>
  </defs>

  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${SHADCN_COLORS.background}" />
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="28" fill="${SHADCN_COLORS.background}" stroke="${SHADCN_COLORS.border}" stroke-width="2" />

  ${hasAvatar
    ? `
  <circle cx="${avatarCenterX}" cy="${avatarCenterY}" r="${avatarRadius}" fill="${SHADCN_COLORS.avatarFallback}" stroke="${SHADCN_COLORS.border}" />
  <image href="${safeAvatarHref}" x="${avatarX + 4}" y="${avatarY + 4}" width="${avatarSize - 8}" height="${avatarSize - 8}" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)" />
`
    : `
  <circle cx="${avatarCenterX}" cy="${avatarCenterY}" r="${avatarRadius}" fill="${SHADCN_COLORS.avatarFallback}" stroke="${SHADCN_COLORS.border}" />
  <text x="${avatarCenterX - 23}" y="${avatarCenterY + 12}" fill="${SHADCN_COLORS.mutedForeground}" font-size="48" font-weight="600" font-family="${APPLE_SF_FONT_STACK}">@</text>
`}

  <text fill="${SHADCN_COLORS.foreground}" font-size="58" font-weight="700" letter-spacing="0.2" dominant-baseline="hanging" font-family="${APPLE_SF_FONT_STACK}">${titleTspans}</text>
  <text fill="${SHADCN_COLORS.mutedForeground}" font-size="32" font-weight="400" dominant-baseline="hanging" font-family="${APPLE_SF_FONT_STACK}">${descriptionTspans}</text>
  ${tagChips}
</svg>`
}

function pickTitle(channel: ChannelInfo) {
  const title = normalizeText(channel.title || '')
  return title || 'Telegram Channel'
}

function pickDescription(channel: ChannelInfo) {
  const rawDescription = channel.description || stripTags(channel.descriptionHTML || '')
  const normalized = normalizeText(rawDescription)
  return normalized || 'Updates from Telegram, mirrored as a static microblog.'
}

export async function generateOgImageFromChannel(channel: ChannelInfo) {
  const title = pickTitle(channel)
  const description = pickDescription(channel)
  const avatarHref = await getAvatarHref(channel.avatar || '')
  const tags = collectTopTags(channel)
  const svg = buildSvg({
    title,
    description,
    avatarHref,
    tags,
  })

  const outputPath = path.resolve(process.cwd(), OUTPUT_RELATIVE_PATH)
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, svg, 'utf8')

  return {
    outputPath,
    relativePath: '/og-auto.svg',
    usedAvatar: Boolean(avatarHref),
    titleLength: title.length,
    descriptionLength: description.length,
    tagsCount: tags.length,
  }
}
