'use client'

import { useEffect } from 'react'

interface DPlayerInstance {
  destroy: () => void
  video?: HTMLVideoElement
}

interface MountedPlayer {
  host: HTMLDivElement
  player: DPlayerInstance
  playerVideo: HTMLVideoElement | null
  timerId: number | null
  onLoaded: (() => void) | null
  onCanPlay: (() => void) | null
  onError: (() => void) | null
}

function getVideoSource(videoEl: HTMLVideoElement) {
  const directSrc = videoEl.getAttribute('src') || videoEl.currentSrc || videoEl.src
  if (directSrc) {
    return directSrc
  }

  const sourceSrc = videoEl.querySelector('source[src]')?.getAttribute('src')
  return sourceSrc || ''
}

function showNativeVideo(videoEl: HTMLVideoElement, fallback = true) {
  videoEl.classList.remove('dplayer-native-hidden')
  if (fallback) {
    videoEl.classList.add('dplayer-fallback')
    videoEl.dataset.dplayerMounted = 'fallback'
  }
  else {
    videoEl.classList.remove('dplayer-fallback')
    delete videoEl.dataset.dplayerMounted
  }
  videoEl.controls = true
}

export function ContentVideoPlayer() {
  useEffect(() => {
    let disposed = false
    let observer: MutationObserver | undefined
    let scanFrame: number | undefined
    const mountedPlayers = new Map<HTMLVideoElement, MountedPlayer>()

    const teardownPlayer = (videoEl: HTMLVideoElement, fallback = true, hostToRemove?: HTMLElement) => {
      const mounted = mountedPlayers.get(videoEl)
      if (!mounted) {
        hostToRemove?.remove()
        showNativeVideo(videoEl, fallback)
        return
      }

      if (mounted.timerId !== null) {
        clearTimeout(mounted.timerId)
      }

      if (mounted.playerVideo) {
        if (mounted.onLoaded) {
          mounted.playerVideo.removeEventListener('loadedmetadata', mounted.onLoaded)
        }
        if (mounted.onCanPlay) {
          mounted.playerVideo.removeEventListener('canplay', mounted.onCanPlay)
        }
        if (mounted.onError) {
          mounted.playerVideo.removeEventListener('error', mounted.onError)
        }
      }

      try {
        mounted.player.destroy()
      }
      catch {
        // Ignore DPlayer teardown errors and always restore native playback.
      }

      mounted.host.remove()
      mountedPlayers.delete(videoEl)
      showNativeVideo(videoEl, fallback)
    }

    const initVideos = async () => {
      const module = await import('dplayer/dist/DPlayer.min.js')
      if (disposed) {
        return
      }

      const DPlayer = module.default

      const mountVideo = (videoEl: HTMLVideoElement) => {
        if (mountedPlayers.has(videoEl)) {
          return
        }

        // Never mount player onto DPlayer's own internal <video> nodes.
        if (videoEl.closest('.dplayer') || videoEl.closest('.dplayer-host')) {
          return
        }

        const staleHost = videoEl.previousElementSibling
        if (
          videoEl.dataset.dplayerMounted === 'true'
          && (!staleHost || !(staleHost instanceof HTMLElement) || !staleHost.classList.contains('dplayer-host'))
        ) {
          showNativeVideo(videoEl, false)
        }

        if (videoEl.dataset.dplayerMounted === 'fallback' || videoEl.dataset.dplayerMounted === 'pending') {
          return
        }

        const src = getVideoSource(videoEl)
        if (!src || !videoEl.parentElement) {
          showNativeVideo(videoEl, true)
          return
        }

        videoEl.dataset.dplayerMounted = 'pending'
        videoEl.classList.add('dplayer-native-hidden')
        videoEl.classList.remove('dplayer-fallback')
        videoEl.controls = false

        const host = document.createElement('div')
        host.className = 'dplayer-host'
        videoEl.parentElement.insertBefore(host, videoEl)

        try {
          const poster = videoEl.getAttribute('poster') || undefined
          const player = new DPlayer({
            container: host,
            autoplay: false,
            loop: false,
            screenshot: false,
            preload: 'metadata',
            mutex: true,
            theme: '#1d9bf0',
            video: {
              url: src,
              pic: poster,
            },
          })

          if (host.classList.contains('dplayer') || host.querySelector('.dplayer')) {
            videoEl.dataset.dplayerMounted = 'true'

            const playerVideo = host.querySelector<HTMLVideoElement>('video')
            const mounted: MountedPlayer = {
              host,
              player,
              playerVideo,
              timerId: null,
              onLoaded: null,
              onCanPlay: null,
              onError: null,
            }

            const markReady = () => {
              if (mounted.timerId !== null) {
                clearTimeout(mounted.timerId)
                mounted.timerId = null
              }

              // DPlayer can report metadata while still unresolved on broken streams.
              const dpVideo = player.video || host.querySelector<HTMLVideoElement>('video')
              if (dpVideo && (!dpVideo.currentSrc || dpVideo.readyState === 0 || dpVideo.videoWidth === 0)) {
                teardownPlayer(videoEl, true)
              }
            }

            const onError = () => {
              teardownPlayer(videoEl, true)
            }

            mounted.onLoaded = markReady
            mounted.onCanPlay = markReady
            mounted.onError = onError

            if (playerVideo) {
              playerVideo.addEventListener('loadedmetadata', markReady, { once: true })
              playerVideo.addEventListener('canplay', markReady, { once: true })
              playerVideo.addEventListener('error', onError, { once: true })
            }

            mounted.timerId = window.setTimeout(() => {
              const dpVideo = player.video || host.querySelector<HTMLVideoElement>('video')
              if (!dpVideo || !dpVideo.currentSrc || dpVideo.readyState === 0) {
                teardownPlayer(videoEl, true)
              }
            }, 8000)

            mountedPlayers.set(videoEl, mounted)
          }
          else {
            teardownPlayer(videoEl, true, host)
          }
        }
        catch {
          teardownPlayer(videoEl, true, host)
        }
      }

      const scanVideos = () => {
        document
          .querySelectorAll<HTMLVideoElement>('.prose-telegram video.post-video')
          .forEach(mountVideo)
      }

      scanVideos()

      observer = new MutationObserver(() => {
        if (scanFrame) {
          cancelAnimationFrame(scanFrame)
        }

        scanFrame = requestAnimationFrame(() => {
          scanVideos()
        })
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      })
    }

    initVideos().catch(() => {
      // Fallback to native video if DPlayer import/init fails.
      document
        .querySelectorAll<HTMLVideoElement>('.prose-telegram video.post-video')
        .forEach(videoEl => showNativeVideo(videoEl, true))
    })

    return () => {
      disposed = true
      observer?.disconnect()
      if (scanFrame) {
        cancelAnimationFrame(scanFrame)
      }
      mountedPlayers.forEach((mounted, videoEl) => {
        if (mounted.timerId !== null) {
          clearTimeout(mounted.timerId)
        }
        if (mounted.playerVideo) {
          if (mounted.onLoaded) {
            mounted.playerVideo.removeEventListener('loadedmetadata', mounted.onLoaded)
          }
          if (mounted.onCanPlay) {
            mounted.playerVideo.removeEventListener('canplay', mounted.onCanPlay)
          }
          if (mounted.onError) {
            mounted.playerVideo.removeEventListener('error', mounted.onError)
          }
        }
        try {
          mounted.player.destroy()
        }
        catch {
          // Ignore DPlayer cleanup errors.
        }
        mounted.host.remove()
        showNativeVideo(videoEl, false)
      })
      mountedPlayers.clear()
    }
  }, [])

  return null
}
