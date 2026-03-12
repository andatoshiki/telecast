import type { ChannelInfo, ChannelPost, ChannelReaction } from '@/lib/types'
import * as cheerio from 'cheerio'
import flourite from 'flourite'
import { LRUCache } from 'lru-cache'
import { $fetch } from 'ofetch'
import { buildStaticProxyUrl, getAppConfig } from '@/lib/config'
import prism from '@/lib/prism'
import { sanitizeDescriptionHtml, sanitizePostHtml } from '@/lib/sanitize'

interface ChannelQuery {
  before?: string
  after?: string
  q?: string
  id?: string
  requestHeaders?: HeadersInit
}

const cache = new LRUCache<string, ChannelInfo | ChannelPost>({
  ttl: 1000 * 60 * 5,
  maxSize: 50 * 1024 * 1024,
  sizeCalculation: item => JSON.stringify(item).length,
})

const TELEGRAM_FETCH_TIMEOUT_MS = 12000

const unnecessaryHeaders = new Set(['host', 'cookie', 'origin', 'referer'])
const codeLanguageClassPattern = /\b(?:language|lang)-([a-z0-9#+-]+)\b/i

const prismLanguageAliases: Record<string, string> = {
  cplusplus: 'cpp',
  cs: 'csharp',
  csharp: 'csharp',
  dockerfile: 'docker',
  golang: 'go',
  html: 'markup',
  js: 'javascript',
  json5: 'json',
  md: 'markdown',
  plaintext: 'text',
  py: 'python',
  shell: 'bash',
  shellscript: 'bash',
  sh: 'bash',
  text: 'text',
  ts: 'typescript',
  xml: 'markup',
  yml: 'yaml',
  zsh: 'bash',
}

function normalizeLanguageCandidate(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^language[-_:]/, '')
    .replace(/^lang[-_:]/, '')
    .replace(/\s+/g, '')
}

function resolvePrismLanguage(value?: string | null) {
  if (!value) {
    return null
  }

  const normalized = normalizeLanguageCandidate(value)
  if (!normalized) {
    return null
  }

  const mapped = prismLanguageAliases[normalized] || normalized
  return prism.languages[mapped] ? mapped : null
}

function extractCodeLanguageFromNode($: cheerio.CheerioAPI, node: cheerio.Element) {
  const pre = $(node)
  const code = pre.find('code').first()
  const candidates = [
    pre.attr('data-language'),
    pre.attr('data-lang'),
    pre.attr('language'),
    pre.attr('lang'),
    code.attr('data-language'),
    code.attr('data-lang'),
    code.attr('language'),
    code.attr('lang'),
  ]

  for (const candidate of candidates) {
    const resolved = resolvePrismLanguage(candidate)
    if (resolved) {
      return resolved
    }
  }

  const classNames = [pre.attr('class') || '', code.attr('class') || ''].join(' ')
  const classMatch = classNames.match(codeLanguageClassPattern)
  if (classMatch?.[1]) {
    const resolved = resolvePrismLanguage(classMatch[1])
    if (resolved) {
      return resolved
    }
  }

  return null
}

function escapeHtmlAttr(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

function normalizeEmoji(emoji: string) {
  const emojiMap: Record<string, string> = {
    '\u2764': '\u2764\uFE0F',
    '\u263A': '\u263A\uFE0F',
    '\u2639': '\u2639\uFE0F',
    '\u2665': '\u2764\uFE0F',
  }
  return emojiMap[emoji] || emoji
}

function getCustomEmojiImage(emojiId?: string, staticProxy = '') {
  if (!emojiId) {
    return ''
  }

  const imageUrl = `https://t.me/i/emoji/${emojiId}.webp`
  return buildStaticProxyUrl(staticProxy, imageUrl)
}

async function hydrateTelegramEmoji($: cheerio.CheerioAPI, content: cheerio.Cheerio<any>, staticProxy = '') {
  const emojiNodes = $(content).find('tg-emoji')?.toArray() ?? []
  if (emojiNodes.length === 0) {
    return
  }

  await Promise.all(emojiNodes.map((emojiEl) => {
    const emojiId = $(emojiEl).attr('emoji-id')
    if (!emojiId) {
      return null
    }

    const imageUrl = getCustomEmojiImage(emojiId, staticProxy)
    if (!imageUrl) {
      return null
    }

    const imageMarkup = `<img class="tg-emoji" src="${escapeHtmlAttr(imageUrl)}" alt="" loading="lazy" />`
    $(emojiEl).replaceWith(imageMarkup)
    return null
  }))
}

function getVideoStickers($: cheerio.CheerioAPI, item: cheerio.Element, staticProxy: string, _index: number) {
  return $(item)
    .find('.js-videosticker_video')
    ?.map((_index, video) => {
      const src = $(video).attr('src')
      const fallback = $(video).find('img')?.attr('src')
      if (!src || !fallback) {
        return ''
      }

      return `
      <div style="background-image:none;width:256px;">
        <video src="${escapeHtmlAttr(buildStaticProxyUrl(staticProxy, src))}" width="100%" height="100%" preload="metadata" muted autoplay loop playsinline disablepictureinpicture>
          <img class="sticker" src="${escapeHtmlAttr(buildStaticProxyUrl(staticProxy, fallback))}" alt="Video sticker" loading="lazy" />
        </video>
      </div>`
    })
    ?.get()
    ?.join('')
}

function getImageStickers($: cheerio.CheerioAPI, item: cheerio.Element, staticProxy: string, _index: number) {
  return $(item)
    .find('.tgme_widget_message_sticker')
    ?.map((_index, image) => {
      const url = $(image).attr('data-webp')
      if (!url) {
        return ''
      }

      return `<img class="sticker" src="${escapeHtmlAttr(buildStaticProxyUrl(staticProxy, url))}" style="width:256px;" alt="Sticker" loading="lazy" />`
    })
    ?.get()
    ?.join('')
}

function getImages($: cheerio.CheerioAPI, item: cheerio.Element, staticProxy: string, index: number, title: string) {
  const images = $(item)
    .find('.tgme_widget_message_photo_wrap')
    ?.map((_index, photo) => {
      const style = $(photo).attr('style')
      const url = style?.match(/url\(["']?(.*?)["']?\)/)?.[1]
      if (!url) {
        return ''
      }

      const escapedTitle = escapeHtmlAttr(title || 'Post image')
      const escapedUrl = escapeHtmlAttr(buildStaticProxyUrl(staticProxy, url))

      return `
      <img class="zoomable" src="${escapedUrl}" alt="${escapedTitle}" loading="lazy" />`
    })
    ?.get()
    ?.filter(Boolean)

  if (!images || images.length === 0) {
    return ''
  }

  const layoutClass = images.length >= 6
    ? 'image-list-masonry'
    : images.length % 2 === 0
      ? 'image-list-even'
      : 'image-list-odd'

  return `<div class="image-list-container ${layoutClass}">${images.join('')}</div>`
}

function getVideo($: cheerio.CheerioAPI, item: cheerio.Element, staticProxy: string, index: number) {
  const video = $(item).find('.tgme_widget_message_video_wrap video')
  if (video.length > 0) {
    const src = video.attr('src')
    if (src) {
      video.attr('src', buildStaticProxyUrl(staticProxy, src))
    }
    video.find('source').each((_sourceIndex, source) => {
      const sourceSrc = $(source).attr('src')
      if (sourceSrc) {
        $(source).attr('src', buildStaticProxyUrl(staticProxy, sourceSrc))
      }
    })
    video
      .addClass('post-video')
      .attr('controls', 'true')
      .attr('preload', index > 15 ? 'auto' : 'metadata')
      .attr('playsinline', 'true')
      .attr('webkit-playsinline', 'true')
  }

  const roundVideo = $(item).find('.tgme_widget_message_roundvideo_wrap video')
  if (roundVideo.length > 0) {
    const src = roundVideo.attr('src')
    if (src) {
      roundVideo.attr('src', buildStaticProxyUrl(staticProxy, src))
    }
    roundVideo.find('source').each((_sourceIndex, source) => {
      const sourceSrc = $(source).attr('src')
      if (sourceSrc) {
        $(source).attr('src', buildStaticProxyUrl(staticProxy, sourceSrc))
      }
    })
    roundVideo
      .addClass('post-video')
      .attr('controls', 'true')
      .attr('preload', index > 15 ? 'auto' : 'metadata')
      .attr('playsinline', 'true')
      .attr('webkit-playsinline', 'true')
  }

  return `${$.html(video)}${$.html(roundVideo)}`
}

function getLinkPreview($: cheerio.CheerioAPI, item: cheerio.Element, staticProxy: string, _index: number) {
  const link = $(item).find('.tgme_widget_message_link_preview')
  const title = $(item).find('.link_preview_title')?.text() || $(item).find('.link_preview_site_name')?.text() || ''
  const description = $(item).find('.link_preview_description')?.text() || ''
  const siteName = link.find('.link_preview_site_name')?.first()

  link.attr('target', '_blank').attr('rel', 'noopener noreferrer').attr('title', description)

  const href = link.attr('href') || ''
  if (href) {
    try {
      const parsed = new URL(href, 'https://t.me')
      const host = parsed.hostname.replace(/^www\./i, '')
      if (host) {
        link.attr('data-host', host)
        if (!siteName?.text()?.trim()) {
          siteName?.text(host)
        }
      }
    }
    catch {
      // Keep rendering even if preview link is malformed.
    }
  }

  const image = $(item).find('.link_preview_image')
  const src = image?.attr('style')?.match(/url\(["']?(.*?)["']?\)/)?.[1]
  if (src) {
    const imageSrc = escapeHtmlAttr(buildStaticProxyUrl(staticProxy, src))
    image.replaceWith(`<img class="link_preview_image" alt="${escapeHtmlAttr(title)}" src="${imageSrc}" loading="lazy" />`)
  }
  else {
    const imageSrc = image.attr('src')
    if (imageSrc) {
      image.attr('src', buildStaticProxyUrl(staticProxy, imageSrc))
    }
  }

  return $.html(link)
}

function getReply($: cheerio.CheerioAPI, item: cheerio.Element, channel: string) {
  const reply = $(item).find('.tgme_widget_message_reply')
  reply?.wrapInner('<small></small>')?.wrapInner('<blockquote></blockquote>')

  const href = reply?.attr('href')
  if (href) {
    try {
      const replyUrl = new URL(href)
      const pathname = replyUrl.pathname.replace(new RegExp(`/${channel}/`, 'i'), '/posts/')
      reply.attr('href', pathname)
    }
    catch {
      // ignore invalid reply URL
    }
  }

  return $.html(reply)
}

async function modifyHtmlContent($: cheerio.CheerioAPI, content: cheerio.Cheerio<any>, index: number, staticProxy: string) {
  await hydrateTelegramEmoji($, content, staticProxy)

  $(content).find('.emoji')?.removeAttr('style')

  $(content).find('a')?.each((_index, anchor) => {
    const title = $(anchor)?.text()
    $(anchor)?.attr('title', title)?.removeAttr('onclick')

    if ($(anchor)?.attr('target') === '_blank') {
      $(anchor).attr('rel', 'noopener noreferrer')
    }
  })

  $(content).find('blockquote[expandable]')?.each((_index, blockquote) => {
    const innerHtml = $(blockquote).html()
    const id = `expand-${index}-${_index}`
    const expandable = `<div class="tg-expandable">
      <input type="checkbox" id="${id}" class="tg-expandable__checkbox">
      <div class="tg-expandable__content">${innerHtml}</div>
      <label for="${id}" class="tg-expandable__toggle" aria-label="Expand or collapse"></label>
    </div>`
    $(blockquote).replaceWith(expandable)
  })

  $(content).find('tg-spoiler')?.each((_index, spoiler) => {
    const id = `spoiler-${index}-${_index}`
    $(spoiler).attr('id', id)?.wrap('<label class="spoiler-button"></label>')?.before('<input type="checkbox" />')
  })

  $(content).find('pre').each((_index, pre) => {
    try {
      $(pre).find('br').replaceWith('\n')

      const code = $(pre).text().replace(/^(?:\r?\n)+/, '')
      const explicitLanguage = extractCodeLanguageFromNode($, pre)
      const detectedLanguage = resolvePrismLanguage(flourite(code, { shiki: true, noUnknown: true })?.language)
      const language = explicitLanguage || detectedLanguage || 'text'
      const grammar = prism.languages[language]
      const highlightedCode = grammar
        ? prism.highlight(code, grammar, language)
        : prism.util.encode(code).toString()

      $(pre).attr('data-language', language)
      $(pre).html(`<code class="language-${language}" data-language="${escapeHtmlAttr(language)}">${highlightedCode}</code>`)
    }
    catch (error) {
      console.error(error)
    }
  })

  return content
}

function getReactions($: cheerio.CheerioAPI, item: cheerio.Element, staticProxy: string): ChannelReaction[] {
  const reactions: ChannelReaction[] = []
  const reactionNodes = $(item).find('.tgme_widget_message_reactions .tgme_reaction').toArray()

  for (const reaction of reactionNodes) {
    const isPaid = $(reaction).hasClass('tgme_reaction_paid')
    let emoji = ''
    let emojiId = ''
    let emojiImage = ''

    const standardEmoji = $(reaction).find('.emoji b')
    if (standardEmoji.length) {
      emoji = normalizeEmoji(standardEmoji.text().trim())
    }

    const tgEmoji = $(reaction).find('tg-emoji')
    if (tgEmoji.length && !emoji) {
      emojiId = tgEmoji.attr('emoji-id') || ''
      emojiImage = getCustomEmojiImage(emojiId, staticProxy)
    }

    if (isPaid && !emoji && !emojiImage) {
      emoji = '\u2B50'
    }

    const clone = $(reaction).clone()
    clone.find('.emoji, tg-emoji, i').remove()
    const count = clone.text().trim()

    if (!count) {
      continue
    }

    reactions.push({
      emoji,
      emojiId,
      emojiImage,
      count,
      isPaid,
    })
  }

  return reactions
}

function getPostViews(messageNode: cheerio.Cheerio<any>) {
  const viewSelectors = [
    '.tgme_widget_message_views',
    '.tgme_widget_message_info_views',
    '.tgme_widget_message_views_wrap',
  ]

  for (const selector of viewSelectors) {
    const viewNode = messageNode.find(selector).first()
    if (!viewNode.length) {
      continue
    }

    const text = viewNode.text().replace(/\s+/g, ' ').trim()
    if (text) {
      return text
    }

    const title = (viewNode.attr('title') || '').trim()
    if (title) {
      return title.replace(/\s+views?$/i, '').trim()
    }

    const ariaLabel = (viewNode.attr('aria-label') || '').trim()
    if (ariaLabel) {
      return ariaLabel.replace(/\s+views?$/i, '').trim()
    }

    const dataViews = (viewNode.attr('data-views') || '').trim()
    if (dataViews) {
      return dataViews
    }
  }

  return ''
}

function isPostEdited(messageNode: cheerio.Cheerio<any>) {
  const explicitEditedMarker = messageNode.find(
    '[class*="edited"], [class*="edit_date"], [class*="message_edit"]',
  )

  if (explicitEditedMarker.length > 0) {
    return true
  }

  const metadataText = messageNode
    .find('.tgme_widget_message_info, .tgme_widget_message_meta')
    .text()
    .replace(/\s+/g, ' ')
    .trim()

  if (/\bedited\b/i.test(metadataText)) {
    return true
  }

  const dateTitle = (messageNode.find('.tgme_widget_message_date').first().attr('title') || '').trim()
  if (/\bedited\b/i.test(dateTitle)) {
    return true
  }

  return false
}

async function getPost(
  $: cheerio.CheerioAPI,
  item: cheerio.Element | null,
  channel: string,
  staticProxy: string,
  index: number,
  reactionsEnabled: boolean,
): Promise<ChannelPost> {
  const messageNode = item ? $(item).find('.tgme_widget_message') : $('.tgme_widget_message')
  const messageTextNode = messageNode.find('.js-message_reply_text')?.length > 0
    ? messageNode.find('.tgme_widget_message_text.js-message_text')
    : messageNode.find('.tgme_widget_message_text')

  const contentNode = await modifyHtmlContent($, messageTextNode, index, staticProxy)

  const text = contentNode?.text() || ''
  const title = text.match(/^.*?(?=[。\n]|http\S)/g)?.[0] ?? text
  const id = messageNode.attr('data-post')?.replace(new RegExp(`${channel}/`, 'i'), '') || ''

  const tags = contentNode
    .find('a[href^="?q="]')
    ?.each((_index, anchor) => {
      const anchorText = $(anchor)?.text()
      $(anchor)?.attr('href', `/search?q=${encodeURIComponent(anchorText)}`)
    })
    ?.map((_index, anchor) => $(anchor)?.text()?.replace('#', ''))
    ?.get()
    ?.filter(Boolean) as string[]

  const hasDirectVideo = messageNode.find('.tgme_widget_message_video_wrap video, .tgme_widget_message_roundvideo_wrap video').length > 0

  const rawContent = [
    getReply($, messageNode[0], channel),
    getImages($, messageNode[0], staticProxy, index, title),
    getVideo($, messageNode[0], staticProxy, index),
    contentNode?.html(),
    getImageStickers($, messageNode[0], staticProxy, index),
    getVideoStickers($, messageNode[0], staticProxy, index),
    messageNode.find('.tgme_widget_message_poll')?.html(),
    $.html(messageNode.find('.tgme_widget_message_document_wrap')),
    hasDirectVideo ? '' : $.html(messageNode.find('.tgme_widget_message_video_player.not_supported')),
    $.html(messageNode.find('.tgme_widget_message_location_wrap')),
    getLinkPreview($, messageNode[0], staticProxy, index),
  ]
    .filter(Boolean)
    .join('')
    .replace(/url\(["']?(https?:\/\/|\/\/)([^"')]+)["']?\)/g, (_match, scheme, tail) => {
      const sourceUrl = scheme === '//' ? `https://${tail}` : `${scheme}${tail}`
      const targetUrl = buildStaticProxyUrl(staticProxy, sourceUrl)
      return `url("${targetUrl}")`
    })

  return {
    id,
    title,
    type: messageNode.attr('class')?.includes('service_message') ? 'service' : 'text',
    datetime: messageNode.find('.tgme_widget_message_date time')?.attr('datetime') || '',
    edited: isPostEdited(messageNode),
    views: getPostViews(messageNode),
    tags,
    text,
    content: sanitizePostHtml(rawContent),
    reactions: reactionsEnabled ? getReactions($, messageNode[0], staticProxy) : [],
  }
}

function normalizeHeaders(requestHeaders?: HeadersInit) {
  const normalized: Record<string, string> = {}
  if (!requestHeaders) {
    return normalized
  }

  const headers = new Headers(requestHeaders)
  headers.forEach((value, key) => {
    const lowered = key.toLowerCase()
    if (!unnecessaryHeaders.has(lowered)) {
      normalized[lowered] = value
    }
  })
  return normalized
}

export async function getChannelInfo(options: ChannelQuery = {}): Promise<ChannelInfo | ChannelPost> {
  const { before = '', after = '', q = '', id = '' } = options
  const cfg = getAppConfig()

  if (!cfg.channel) {
    throw new Error('Missing channel identifier in SITE_CONSTANTS.channel')
  }

  const cacheKey = JSON.stringify({
    channel: cfg.channel,
    host: cfg.telegramHost,
    staticProxy: cfg.staticProxy,
    reactions: cfg.reactionsEnabled,
    before,
    after,
    q,
    id,
  })

  const cachedResult = cache.get(cacheKey)
  if (cachedResult) {
    console.info('Cache hit', { before, after, q, id })
    return JSON.parse(JSON.stringify(cachedResult))
  }

  const url = id
    ? `https://${cfg.telegramHost}/${cfg.channel}/${id}?embed=1&mode=tme`
    : `https://${cfg.telegramHost}/s/${cfg.channel}`

  const headers = normalizeHeaders(options.requestHeaders)

  console.info('Fetching channel data', { url, before, after, q, id })

  let html = ''
  try {
    html = await $fetch<string>(url, {
      headers,
      query: {
        before: before || undefined,
        after: after || undefined,
        q: q || undefined,
      },
      retry: 1,
      retryDelay: 250,
      timeout: TELEGRAM_FETCH_TIMEOUT_MS,
    })
  }
  catch (error) {
    console.error('Failed to fetch channel data', {
      url,
      before,
      after,
      q,
      id,
      error: error instanceof Error ? error.message : String(error),
    })

    const baselineCacheKey = JSON.stringify({
      channel: cfg.channel,
      host: cfg.telegramHost,
      staticProxy: cfg.staticProxy,
      reactions: cfg.reactionsEnabled,
      before: '',
      after: '',
      q: '',
      id: '',
    })

    const baselineCached = cache.get(baselineCacheKey)
    if (baselineCached && 'posts' in baselineCached) {
      return JSON.parse(JSON.stringify(baselineCached))
    }

    if (id) {
      return {
        id,
        title: `Post ${id}`,
        type: 'text',
        datetime: '',
        edited: false,
        views: '',
        tags: [],
        text: '',
        content: '',
        reactions: [],
      }
    }

    return {
      posts: [],
      title: cfg.channel,
      description: '',
      descriptionHTML: '',
      avatar: '',
    }
  }

  const $ = cheerio.load(html, {}, false)

  if (id) {
    const post = await getPost($, null, cfg.channel, cfg.staticProxy, 0, cfg.reactionsEnabled)
    cache.set(cacheKey, post)
    return post
  }

  const postNodes = $('.tgme_channel_history  .tgme_widget_message_wrap')?.toArray() ?? []
  const parsedPosts = await Promise.all(postNodes.map((item, index) => getPost($, item, cfg.channel, cfg.staticProxy, index, cfg.reactionsEnabled)))

  const posts = parsedPosts
    .reverse()
    .filter(post => post.type === 'text' && post.id && post.content)

  const descriptionNode = await modifyHtmlContent($, $('.tgme_channel_info_description'), 0, cfg.staticProxy)

  const channelInfo: ChannelInfo = {
    posts,
    title: $('.tgme_channel_info_header_title')?.text() || cfg.channel,
    description: $('.tgme_channel_info_description')?.text() || '',
    descriptionHTML: sanitizeDescriptionHtml(descriptionNode?.html() || ''),
    avatar: $('.tgme_page_photo_image img')?.attr('src') || '',
  }

  cache.set(cacheKey, channelInfo)
  return channelInfo
}
