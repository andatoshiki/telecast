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

export function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}
