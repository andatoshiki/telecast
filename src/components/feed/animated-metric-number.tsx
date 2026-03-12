'use client'

import NumberFlow from '@number-flow/react'
import { useEffect, useMemo, useRef, useState } from 'react'

interface AnimatedMetricNumberProps {
  value: string
}

function parseMetricValue(value: string) {
  const normalized = value.replaceAll(',', '').replace(/\s+/g, '').trim()
  if (!normalized) {
    return null
  }

  const match = normalized.match(/^([+-]?\d+(?:\.\d+)?)([kmb])?$/i)
  if (!match) {
    return null
  }

  const base = Number(match[1])
  if (Number.isNaN(base)) {
    return null
  }

  const suffix = (match[2] || '').toLowerCase()
  const multiplier = suffix === 'k'
    ? 1_000
    : suffix === 'm'
      ? 1_000_000
      : suffix === 'b'
        ? 1_000_000_000
        : 1

  return {
    value: Math.round(base * multiplier),
    useCompactFormat: suffix.length > 0,
  }
}

export function AnimatedMetricNumber({ value }: AnimatedMetricNumberProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const parsedValue = useMemo(() => parseMetricValue(value), [value])

  useEffect(() => {
    const node = ref.current
    if (!node || isVisible) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some(entry => entry.isIntersecting)) {
          return
        }

        setIsVisible(true)
        observer.disconnect()
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -8% 0px',
      },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [isVisible])

  if (parsedValue === null) {
    return <span ref={ref}>{value}</span>
  }

  const currentValue = isVisible ? parsedValue.value : 0

  return (
    <span ref={ref}>
      <NumberFlow
        value={currentValue}
        format={parsedValue.useCompactFormat
          ? {
              notation: 'compact',
              maximumFractionDigits: 1,
            }
          : undefined}
      />
    </span>
  )
}
