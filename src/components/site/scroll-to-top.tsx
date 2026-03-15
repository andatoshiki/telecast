'use client'

import type { MouseEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/* SVG geometry — all computed at module level */
const VB = 48
const SW = 4
const R = (VB - SW) / 2
const C = 2 * Math.PI * R
const HALF = VB / 2

export const ScrollToTop = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { ariaLabel?: string }
>(({ className, ariaLabel = 'Back to top', onClick, type, ...rest }, ref) => {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    function update() {
      const docH = document.documentElement.scrollHeight - window.innerHeight
      if (docH <= 0) {
        setPct(0)
        return
      }

      setPct(Math.min(Math.round((window.scrollY / docH) * 100), 100))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const scrollToTop = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) {
      return
    }

    const doc = event.currentTarget.ownerDocument
    const scrollRoot = doc.scrollingElement

    scrollRoot?.scrollTo({ top: 0, behavior: 'smooth' })
    doc.documentElement.scrollTo({ top: 0, behavior: 'smooth' })
    doc.body.scrollTo({ top: 0, behavior: 'smooth' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [onClick])

  const visible = pct > 0
  const complete = pct >= 100
  const offset = C - (pct / 100) * C

  return (
    <button
      {...rest}
      ref={ref}
      type={type ?? 'button'}
      onClick={scrollToTop}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center justify-center transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className,
      )}
    >
      {complete
        ? (
            <ArrowUp className="h-[22px] w-[22px] stroke-current stroke-[1.9] sm:h-6 sm:w-6" />
          )
        : (
            <span className="relative inline-flex items-center justify-center h-[22px] w-[22px] sm:h-6 sm:w-6">
              <svg
                viewBox={`0 0 ${VB} ${VB}`}
                fill="none"
                className="absolute inset-0 h-full w-full -rotate-90"
              >
                <circle cx={HALF} cy={HALF} r={R} stroke="currentColor" strokeWidth={SW} opacity={0.15} />
                <circle
                  cx={HALF}
                  cy={HALF}
                  r={R}
                  stroke="currentColor"
                  strokeWidth={SW}
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={offset}
                />
              </svg>
              <span className="relative text-[8px] font-semibold tabular-nums leading-none">
                {pct}
              </span>
            </span>
          )}
    </button>
  )
})

ScrollToTop.displayName = 'ScrollToTop'
