'use client'

import type { Ref } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SidebarBackButtonProps {
  label: string
  buttonClassName: string
  iconClassName: string
  ref?: Ref<HTMLButtonElement>
}

export function SidebarBackButton({ label, buttonClassName, iconClassName, ref }: SidebarBackButtonProps) {
  const router = useRouter()

  return (
    <Button
      ref={ref}
      variant="ghost"
      className={buttonClassName}
      aria-label={label}
      onClick={() => router.back()}
    >
      <ArrowLeft className={cn(iconClassName, 'fill-none')} />
      <span className="sr-only">{label}</span>
    </Button>
  )
}
