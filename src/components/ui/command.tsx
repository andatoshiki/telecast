'use client'

import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle } from './dialog'

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
      className,
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

interface CommandDialogProps extends React.ComponentPropsWithoutRef<typeof Dialog> {
  children: React.ReactNode
  commandProps?: React.ComponentPropsWithoutRef<typeof Command>
  title?: string
  closeLabel?: string
}

function CommandDialog({ children, commandProps, title = 'Command menu', closeLabel = 'Close', ...props }: CommandDialogProps) {
  const { className: commandClassName, ...restCommandProps } = commandProps || {}

  return (
    <Dialog {...props}>
      <DialogContent closeLabel={closeLabel} className="w-[calc(100vw-2rem)] max-w-2xl overflow-hidden rounded-2xl p-0 shadow-lg">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <Command
          className={cn(
            '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-12 [&_[cmdk-input]]:px-2 [&_[cmdk-input]]:text-[15px] [&_[cmdk-input]]:outline-none [&_[cmdk-item]]:rounded-md [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:text-sm [&_[cmdk-item]]:aria-selected:bg-accent [&_[cmdk-item]]:aria-selected:text-accent-foreground [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4 [&_[cmdk-item]_svg]:shrink-0 [&_[cmdk-list]]:max-h-[420px] [&_[cmdk-list]]:overflow-y-auto [&_[cmdk-separator]]:mx-2 [&_[cmdk-separator]]:h-px [&_[cmdk-separator]]:bg-border',
            commandClassName,
          )}
          {...restCommandProps}
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  </div>
))
CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[420px] overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
))
CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm text-muted-foreground"
    {...props}
  />
))
CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn('overflow-hidden p-1 text-foreground', className)}
    {...props}
  />
))
CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 h-px bg-border', className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
      className,
    )}
    {...props}
  />
))
CommandItem.displayName = CommandPrimitive.Item.displayName

function CommandShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  )
}
CommandShortcut.displayName = 'CommandShortcut'

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
}
