'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

const ZOOMABLE_IMAGE_SELECTOR = '.prose-telegram img.zoomable'

export function ContentZoom() {
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState('')
  const [alt, setAlt] = useState('')
  const scanFrame = useRef<number | undefined>(undefined)

  const handleImageClick = useCallback((e: MouseEvent) => {
    const img = e.currentTarget as HTMLImageElement
    setSrc(img.src)
    setAlt(img.alt || '')
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    const undo = () => {
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('padding-right')
      document.body.style.removeProperty('margin-right')
    }
    const frame = requestAnimationFrame(undo)
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    const enhanceImage = (img: HTMLImageElement) => {
      if (img.dataset.imageEnhanced === 'true') {
        return
      }
      img.dataset.imageEnhanced = 'true'
      img.decoding = 'async'

      const markLoaded = () => {
        img.classList.remove('image-loading')
        img.classList.add('image-loaded')
      }

      if (img.complete && img.naturalWidth > 0) {
        markLoaded()
      }
      else {
        img.classList.add('image-loading')
        img.addEventListener('load', markLoaded, { once: true })
        img.addEventListener('error', markLoaded, { once: true })
      }
    }

    const attachedImages = new Set<HTMLImageElement>()

    const scanImages = () => {
      const images = document.querySelectorAll<HTMLImageElement>(ZOOMABLE_IMAGE_SELECTOR)
      images.forEach((img) => {
        enhanceImage(img)
        if (!attachedImages.has(img)) {
          attachedImages.add(img)
          img.addEventListener('click', handleImageClick)
        }
      })
    }

    const observer = new MutationObserver(() => {
      if (scanFrame.current) {
        cancelAnimationFrame(scanFrame.current)
      }
      scanFrame.current = requestAnimationFrame(scanImages)
    })

    scanImages()
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      if (scanFrame.current) {
        cancelAnimationFrame(scanFrame.current)
      }
      attachedImages.forEach(img => img.removeEventListener('click', handleImageClick))
      attachedImages.clear()
    }
  }, [handleImageClick])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-[90vw] cursor-zoom-out border-0 bg-transparent p-0 shadow-none outline-none ring-0 focus:outline-none focus:ring-0 [&>button]:hidden"
        onClick={() => setOpen(false)}
        onInteractOutside={() => setOpen(false)}
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{alt || 'Image preview'}</DialogTitle>
        <div className="relative flex max-h-[85vh] items-center justify-center">
          {src && (
            <img
              src={src}
              alt={alt}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
