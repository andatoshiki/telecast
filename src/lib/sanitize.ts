import sanitizeHtml from 'sanitize-html'

const commonTags = sanitizeHtml.defaults.allowedTags.concat([
  'img',
  'video',
  'source',
  'button',
  'input',
  'label',
  'figure',
  'figcaption',
  'blockquote',
  'tg-spoiler',
])

const commonAttributes = {
  ...sanitizeHtml.defaults.allowedAttributes,
  '*': ['class', 'id', 'style', 'title', 'aria-label'],
  'a': ['href', 'name', 'target', 'rel', 'title'],
  'img': ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'class'],
  'video': ['src', 'width', 'height', 'poster', 'controls', 'autoplay', 'loop', 'muted', 'playsinline', 'preload'],
  'source': ['src', 'type'],
  'button': ['type', 'class', 'id', 'popover', 'popovertarget', 'popovertargetaction'],
  'input': ['type', 'class', 'id', 'checked'],
  'label': ['for', 'class', 'aria-label'],
  'div': ['class', 'id', 'style'],
}

const sanitizeConfig: sanitizeHtml.IOptions = {
  allowedTags: commonTags,
  allowedAttributes: commonAttributes,
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto', 'tel'],
    img: ['http', 'https', 'data'],
    video: ['http', 'https'],
    source: ['http', 'https'],
  },
}

export function sanitizePostHtml(html: string) {
  return sanitizeHtml(html || '', sanitizeConfig)
}

export function sanitizeDescriptionHtml(html: string) {
  const descriptionAllowedTags = Array.isArray(sanitizeConfig.allowedTags)
    ? sanitizeConfig.allowedTags.filter(tag => tag !== 'button' && tag !== 'input' && tag !== 'video')
    : []

  return sanitizeHtml(html || '', {
    ...sanitizeConfig,
    allowedTags: descriptionAllowedTags,
  })
}

const INLINE_CODE_TOKEN_PREFIX = '__TELECAST_INLINE_CODE_'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

export function renderInlineMarkdown(input: string) {
  const raw = input.trim()
  if (!raw) {
    return ''
  }

  const codeSegments: string[] = []
  const withCodePlaceholders = raw
    .replace(/\r\n?/g, '\n')
    .replace(/`([^`\n]+)`/g, (_match, codeValue: string) => {
      const token = `${INLINE_CODE_TOKEN_PREFIX}${codeSegments.length}__`
      codeSegments.push(`<code>${escapeHtml(codeValue)}</code>`)
      return token
    })

  let html = escapeHtml(withCodePlaceholders)

  html = html
    .replace(/\[([^\]\n]+?)\]\(([^)\s]+?)\)/g, (_match, label: string, href: string) => (
      `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
    ))
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, '$1<em>$2</em>')
    .replace(/~~([^~\n]+?)~~/g, '<s>$1</s>')
    .replace(/\n{2,}/g, '<br /><br />')
    .replace(/\n/g, '<br />')

  for (let index = 0; index < codeSegments.length; index += 1) {
    const token = `${INLINE_CODE_TOKEN_PREFIX}${index}__`
    html = html.replaceAll(token, codeSegments[index])
  }

  return sanitizeHtml(html, {
    allowedTags: ['a', 'strong', 'em', 'code', 'br', 's'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto', 'tel'],
    },
  })
}

export function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}
