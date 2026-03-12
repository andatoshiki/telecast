'use client'

import type twemoji from 'twemoji'
import { useEffect } from 'react'

const TWEMOJI_SCOPE_SELECTOR = '[data-twemoji-scope]'
const TWEMOJI_BASE_URL = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'

export function ContentTwemoji() {
  useEffect(() => {
    let disposed = false
    let observer: MutationObserver | undefined
    let scanFrame: number | undefined
    let parse: typeof twemoji.parse | null = null

    const parseOptions = {
      base: TWEMOJI_BASE_URL,
      folder: 'svg',
      ext: '.svg',
      className: 'twemoji',
      attributes: () => ({
        loading: 'lazy',
        decoding: 'async',
        draggable: 'false',
      }),
    }

    const parseScope = (scope: HTMLElement) => {
      if (!parse || scope.dataset.twemojiEnhanced === 'true') {
        return
      }

      parse(scope, parseOptions)
      scope.dataset.twemojiEnhanced = 'true'
    }

    const scanScopes = () => {
      const scopes = document.querySelectorAll<HTMLElement>(TWEMOJI_SCOPE_SELECTOR)
      scopes.forEach(parseScope)
    }

    const markScopeDirty = (node: Node) => {
      if (!(node instanceof HTMLElement)) {
        return
      }

      const scope = node.matches(TWEMOJI_SCOPE_SELECTOR)
        ? node
        : node.closest<HTMLElement>(TWEMOJI_SCOPE_SELECTOR)

      if (scope) {
        scope.dataset.twemojiEnhanced = 'false'
      }
    }

    const init = async () => {
      const module = await import('twemoji')
      if (disposed) {
        return
      }

      const twemojiApi = (module.default || module) as typeof twemoji
      parse = twemojiApi.parse.bind(twemojiApi)

      scanScopes()

      observer = new MutationObserver((records) => {
        for (const record of records) {
          markScopeDirty(record.target)
          for (const node of record.addedNodes) {
            markScopeDirty(node)
          }
        }

        if (scanFrame) {
          cancelAnimationFrame(scanFrame)
        }

        scanFrame = requestAnimationFrame(scanScopes)
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      })
    }

    init().catch(() => {
      // Silently skip emoji replacement if Twemoji fails to initialize.
    })

    return () => {
      disposed = true
      observer?.disconnect()
      if (scanFrame) {
        cancelAnimationFrame(scanFrame)
      }
    }
  }, [])

  return null
}
