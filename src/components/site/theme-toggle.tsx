'use client'

import type { Ref } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  ariaLabel?: string
  ref?: Ref<HTMLButtonElement>
}

export function ThemeToggle({ className, ariaLabel = 'Toggle theme', ref }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <Button
      ref={ref}
      type="button"
      size="icon"
      variant="ghost"
      className={cn('rounded-full', className)}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={ariaLabel}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
