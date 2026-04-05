/// <reference lib="webworker" />

/**
 * Telecast PWA Service Worker
 *
 * Provides offline caching with a network-first strategy for pages
 * and a cache-first strategy for static assets / media.
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])
const CACHE_PREFIX = 'telecast-'
const CACHE_VERSION = 'telecast-v2'
const IS_LOCAL_DEVELOPMENT = LOCAL_HOSTNAMES.has(globalThis.location.hostname)

/** Assets cached on SW install for instant offline shell. */
const PRECACHE_URLS = ['/', '/favicon.svg', '/favicon.ico']

/** Cache-first: immutable static assets & media. */
const STATIC_EXTENSIONS
  = /\.(?:js|css|woff2?|ttf|otf|ico|svg|png|jpe?g|webp|avif|gif|mp4|webm)$/i

async function clearTelecastCaches() {
  const keys = await caches.keys()
  await Promise.all(
    keys
      .filter(key => key.startsWith(CACHE_PREFIX))
      .map(key => caches.delete(key)),
  )
}

/**
 * On install, precache the app shell so the site works offline immediately.
 */
globalThis.addEventListener('install', (event) => {
  if (IS_LOCAL_DEVELOPMENT) {
    event.waitUntil(globalThis.skipWaiting())
    return
  }

  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => globalThis.skipWaiting()),
  )
})

/**
 * On activate, purge old cache versions and claim all clients.
 */
globalThis.addEventListener('activate', (event) => {
  if (IS_LOCAL_DEVELOPMENT) {
    event.waitUntil(
      clearTelecastCaches()
        .then(() => globalThis.registration.unregister())
        .then(() => globalThis.clients.matchAll({ type: 'window' }))
        .then(clients => Promise.all(clients.map(client => client.navigate(client.url)))),
    )
    return
  }

  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_VERSION)
            .map(key => caches.delete(key)),
        ),
      )
      .then(() => globalThis.clients.claim()),
  )
})

/**
 * Fetch handler — two strategies:
 *
 *  1. **Cache-first** for static assets (JS, CSS, fonts, images, video).
 *     Falls back to network and caches the response for next time.
 *
 *  2. **Network-first** for navigation / API requests.
 *     Falls back to cache when offline.
 */
globalThis.addEventListener('fetch', (event) => {
  if (IS_LOCAL_DEVELOPMENT) {
    return
  }

  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== globalThis.location.origin)
    return

  // Skip non-GET requests
  if (request.method !== 'GET')
    return

  if (STATIC_EXTENSIONS.test(url.pathname)) {
    // --- Cache-first for static assets ---
    event.respondWith(
      caches.match(request).then(
        cached =>
          cached
          || fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_VERSION).then(cache => cache.put(request, clone))
            }
            return response
          }),
      ),
    )
  }
  else {
    // --- Network-first for pages / data ---
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_VERSION).then(cache => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request)),
    )
  }
})
