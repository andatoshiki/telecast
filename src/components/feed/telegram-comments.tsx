'use client'

import { useEffect, useRef } from 'react'

interface TelegramCommentsProps {
  channel: string
  postId: string
}

export function TelegramComments({ channel, postId }: TelegramCommentsProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hostRef.current || !channel || !postId) {
      return
    }

    hostRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js'
    script.setAttribute('data-telegram-discussion', `${channel}/${postId}`)
    script.setAttribute('data-comments-limit', '50')
    script.setAttribute('data-colorful', '1')
    script.setAttribute('data-color', '454545')

    hostRef.current.appendChild(script)
  }, [channel, postId])

  return <div ref={hostRef} className="mt-6 overflow-hidden rounded-lg border bg-white/60 p-2" />
}
