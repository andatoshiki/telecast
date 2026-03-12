import * as React from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('surface text-card-foreground', className)} {...props} />
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-semibold leading-tight tracking-tight', className)} {...props} />
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-5 pt-0', className)} {...props} />
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
