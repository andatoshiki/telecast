'use client'

import { useEffect } from 'react'

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])
const CACHE_PREFIX = 'telecast-'

async function clearTelecastCaches() {
  if (!('caches' in window)) {
    return
  }

  const keys = await caches.keys()
  await Promise.all(
    keys
      .filter(key => key.startsWith(CACHE_PREFIX))
      .map(key => caches.delete(key)),
  )
}

async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  const registrations = await navigator.serviceWorker.getRegistrations()
  if (registrations.length === 0) {
    await clearTelecastCaches()
    return false
  }

  await Promise.all(registrations.map(registration => registration.unregister()))
  await clearTelecastCaches()
  return true
}

/**
 * Registers the service worker on mount when PWA is enabled.
 * Renders nothing — drop into the layout tree for side-effect only.
 */
export function ServiceWorkerRegister({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    const isLocalDevelopmentHost = LOCAL_HOSTNAMES.has(window.location.hostname)

    if (!enabled || isLocalDevelopmentHost) {
      unregisterServiceWorkers().catch(err => console.warn('SW cleanup failed:', err))
      return
    }

    if (!('serviceWorker' in navigator)) {
      return
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(err => console.warn('SW registration failed:', err))
  }, [enabled])

  return null
}
