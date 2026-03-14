'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker on mount when PWA is enabled.
 * Renders nothing — drop into the layout tree for side-effect only.
 */
export function ServiceWorkerRegister({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (enabled && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(err => console.warn('SW registration failed:', err))
    }
  }, [enabled])

  return null
}
