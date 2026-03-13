'use client'

import type { Ref } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  ariaLabel?: string
  ref?: Ref<HTMLButtonElement>
}

export function ThemeToggle({ className, ariaLabel = 'Toggle theme', ref }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      ref={ref}
      type="button"
      size="icon"
      variant="ghost"
      className={cn('relative rounded-full', className)}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={ariaLabel}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform duration-200 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform duration-200 dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
