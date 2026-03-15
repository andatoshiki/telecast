import type { ReactNode } from 'react'
import type { AppLocale } from '@/lib/i18n'
import type { ChannelInfo } from '@/lib/types'
import type { LocaleMessages } from '@/locales/en'
import { Github, House, Languages, Rss, Send, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemCheck,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { buildStaticProxyUrl, getAppConfig } from '@/lib/config'
import { getLocaleMessages, localizePath, normalizeAppLocale, SUPPORTED_LOCALES } from '@/lib/i18n'
import { renderInlineMarkdown } from '@/lib/sanitize'
import { cn } from '@/lib/utils'
import packageJson from '../../../package.json'
import { CommandPalette } from './command-palette'
import { ContentAlbum } from './content-album'
import { ContentCodeCopy } from './content-code-copy'
import { ContentTwemoji } from './content-twemoji'
import { ContentVideoPlayer } from './content-video-player'
import { ContentZoom } from './content-zoom'
import { ScrollToTop } from './scroll-to-top'
import { SidebarBackButton } from './sidebar-back-button'
import { ThemeToggle } from './theme-toggle'

interface PageFrameProps {
  channel: ChannelInfo
  currentPath: string
  children: ReactNode
  locale?: AppLocale
  messages?: LocaleMessages
  currentLocalePath?: string
  pageNumber?: number
  showBack?: boolean
}

function getPageTitle(currentPath: string, messages: LocaleMessages, pageNumber?: number) {
  if (currentPath === '/tags') {
    return messages.pageTitle.tags
  }

  if (currentPath === '/search') {
    return messages.pageTitle.search
  }

  if (pageNumber && pageNumber > 1) {
    return `${messages.pageTitle.page} ${pageNumber}`
  }

  return messages.pageTitle.home
}

function getTelegramChannelHref(
  telegramHost: string,
  telegramValue: string,
  channelValue: string,
) {
  const raw = (telegramValue || channelValue || '').trim()
  if (!raw) {
    return ''
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw
  }

  const host = (telegramHost || 't.me').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  const handle = raw.replace(/^@/, '')
  return `https://${host}/${handle}`
}

export function PageFrame({
  channel,
  currentPath,
  children,
  locale,
  messages,
  currentLocalePath,
  pageNumber,
  showBack,
}: PageFrameProps) {
  const config = getAppConfig()
  const resolvedLocale = locale || normalizeAppLocale(config.locale)
  const resolvedMessages = messages || getLocaleMessages(resolvedLocale)
  const activePathForLocaleSwitch = currentLocalePath || currentPath
  const githubRepoHref = 'https://github.com/andatoshiki/telecast'
  const githubRepoTitle = `${resolvedMessages.external.github} telecast`

  const avatar = channel.avatar?.startsWith('http')
    ? buildStaticProxyUrl(config.staticProxy, channel.avatar)
    : (channel.avatar || '/favicon.svg')
  const telegramChannelHref = getTelegramChannelHref(config.telegramHost, config.telegram, config.channel)

  const navItems = [
    { title: resolvedMessages.nav.home, href: '/', enabled: true },
    { title: resolvedMessages.nav.tags, href: '/tags', enabled: true },
  ]
  const enabledNavItems = navItems.filter(item => item.enabled)
  const internalCommandItems = [
    { title: resolvedMessages.external.rss, href: '/rss.xml' },
    { title: githubRepoTitle, href: githubRepoHref },
    telegramChannelHref
      ? { title: `${resolvedMessages.external.telegram} ${(config.telegram || config.channel).trim()}`.trim(), href: telegramChannelHref }
      : null,
  ].filter((item): item is { title: string, href: string } => Boolean(item))
  const customCommandItems = [
    config.website
      ? { title: resolvedMessages.external.website, href: config.website }
      : null,
    config.twitter
      ? { title: `${resolvedMessages.external.twitter} @${config.twitter}`, href: `https://twitter.com/${config.twitter}` }
      : null,
    config.mastodon
      ? { title: `${resolvedMessages.external.mastodon} @${config.mastodon.split('@').pop()}`, href: `https://${config.mastodon}` }
      : null,
    config.bluesky
      ? { title: `${resolvedMessages.external.bluesky} @${config.bluesky}`, href: `https://bsky.app/profile/${config.bluesky}` }
      : null,
  ].filter((item): item is { title: string, href: string } => Boolean(item))
  const localeMenuLabels: Record<AppLocale, string> = {
    en: 'English',
    ja: '日本语',
    zh: '中文',
  }
  const sidebarIconButtonClass = 'h-11 w-11 sm:h-12 sm:w-12 p-0 shrink-0 rounded-full bg-transparent text-muted-foreground transition-colors duration-200 hover:bg-muted/70 hover:text-foreground focus-visible:bg-muted/70 data-[state=open]:bg-muted/70 data-[state=open]:text-foreground data-[state=open]:[&_svg]:fill-current'
  const sidebarIconGlyphClass = 'h-[22px] w-[22px] sm:h-6 sm:w-6 stroke-current stroke-[1.9] transition-[fill] duration-200'
  const sidebarIconActiveClass = 'bg-muted/70 text-foreground'
  const isHomeActive = currentPath === '/'
  const isTagsActive = currentPath === '/tags'
  const bannerMarkdownHtml = renderInlineMarkdown(config.customBanner)
  const footerMarkdownHtml = renderInlineMarkdown(config.customFooter)

  return (
    <div className="min-h-screen bg-background">
      {bannerMarkdownHtml
        ? (
            <div className="border-b bg-muted/30 px-4 py-2 text-center text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere] [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-foreground [&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_strong]:font-semibold">
              <div dangerouslySetInnerHTML={{ __html: bannerMarkdownHtml }} />
            </div>
          )
        : null}

      <div className="mx-auto grid max-w-[784px] grid-cols-[60px_minmax(0,1fr)] sm:grid-cols-[72px_minmax(0,1fr)] border-r">
        <aside className="sticky top-0 z-10 h-screen border-r bg-background/95">
          <TooltipProvider delayDuration={150}>
            <div className="flex h-full w-full flex-col items-center gap-1.5 px-1 py-3 sm:gap-2 sm:px-2 sm:py-4">
              {showBack
                ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <SidebarBackButton
                            label={resolvedMessages.post.backToFeed}
                            buttonClassName={sidebarIconButtonClass}
                            iconClassName={sidebarIconGlyphClass}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">{resolvedMessages.post.backToFeed}</TooltipContent>
                    </Tooltip>
                  )
                : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={localizePath(resolvedLocale, '/')}
                    aria-label={resolvedMessages.nav.home}
                    className={cn(
                      'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      sidebarIconButtonClass,
                      isHomeActive && sidebarIconActiveClass,
                    )}
                  >
                    <House className={cn(sidebarIconGlyphClass, isHomeActive ? 'fill-current' : 'fill-none')} />
                    <span className="sr-only">{resolvedMessages.nav.home}</span>
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right">{resolvedMessages.nav.home}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={localizePath(resolvedLocale, '/tags')}
                    aria-label={resolvedMessages.nav.tags}
                    className={cn(
                      'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      sidebarIconButtonClass,
                      isTagsActive && sidebarIconActiveClass,
                    )}
                  >
                    <Tag className={cn(sidebarIconGlyphClass, isTagsActive ? 'fill-current' : 'fill-none')} />
                    <span className="sr-only">{resolvedMessages.nav.tags}</span>
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right">{resolvedMessages.nav.tags}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    className={sidebarIconButtonClass}
                  >
                    <a
                      href="/rss.xml"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={resolvedMessages.external.rss}
                    >
                      <Rss className={cn(sidebarIconGlyphClass, 'fill-none')} />
                      <span className="sr-only">{resolvedMessages.external.rss}</span>
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{resolvedMessages.external.rss}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    className={sidebarIconButtonClass}
                  >
                    <a
                      href={githubRepoHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={githubRepoTitle}
                    >
                      <Github className={cn(sidebarIconGlyphClass, 'fill-none')} />
                      <span className="sr-only">{githubRepoTitle}</span>
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{githubRepoTitle}</TooltipContent>
              </Tooltip>
              {telegramChannelHref
                ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          variant="ghost"
                          className={sidebarIconButtonClass}
                        >
                          <a
                            href={telegramChannelHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={resolvedMessages.external.telegram}
                          >
                            <Send className={cn(sidebarIconGlyphClass, 'fill-none')} />
                            <span className="sr-only">{resolvedMessages.external.telegram}</span>
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{resolvedMessages.external.telegram}</TooltipContent>
                    </Tooltip>
                  )
                : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <CommandPalette
                      navItems={enabledNavItems}
                      internalNavItems={internalCommandItems}
                      customNavItems={customCommandItems}
                      locale={resolvedLocale}
                      messages={resolvedMessages}
                      triggerMode="icon"
                      triggerClassName={sidebarIconButtonClass}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <span className="flex items-center gap-1.5">
                    {resolvedMessages.nav.search}
                    <kbd className="rounded border border-primary-foreground/25 bg-primary-foreground/10 px-1 py-0.5 font-mono text-[10px] leading-none">⌘ K</kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <DropdownMenu>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={sidebarIconButtonClass}
                        aria-label={resolvedMessages.sidebar.language}
                      >
                        <Languages className={cn(sidebarIconGlyphClass, 'fill-none')} />
                        <span className="sr-only">{resolvedMessages.sidebar.language}</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <DropdownMenuContent side="right" align="start" className="w-44">
                    {SUPPORTED_LOCALES.map(targetLocale => (
                      <DropdownMenuItem key={`locale-switch-${targetLocale}`} asChild>
                        <a
                          href={localizePath(targetLocale, activePathForLocaleSwitch)}
                          className="flex w-full items-center gap-2"
                        >
                          <span>{localeMenuLabels[targetLocale]}</span>
                          <DropdownMenuItemCheck visible={targetLocale === resolvedLocale} />
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <TooltipContent side="right">{resolvedMessages.sidebar.language}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ThemeToggle
                      ariaLabel={resolvedMessages.theme.toggle}
                      className={`${sidebarIconButtonClass} [&_svg]:h-[22px] [&_svg]:w-[22px] sm:[&_svg]:h-6 sm:[&_svg]:w-6 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.9]`}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">{resolvedMessages.theme.toggle}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ScrollToTop
                    ariaLabel={resolvedMessages.sidebar.backToTop}
                    className={sidebarIconButtonClass}
                  />
                </TooltipTrigger>
                <TooltipContent side="right">{resolvedMessages.sidebar.backToTop}</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </aside>

        <main className="min-w-0">
          <div className="sticky top-0 z-[5] border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <div className="flex items-center justify-between gap-3">
              <a href={localizePath(resolvedLocale, '/')} className="flex min-w-0 items-center gap-3">
                <img
                  src={avatar}
                  alt={channel.title}
                  className="h-11 w-11 rounded-full border object-cover"
                  loading="eager"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold leading-tight">{channel.title}</p>
                  {channel.subscriberCount
                    ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {channel.subscriberCount}
                          {' '}
                          {resolvedMessages.feed.subscribers}
                        </p>
                      )
                    : null}
                </div>
              </a>
              <p className="shrink-0 text-sm font-medium text-muted-foreground">{getPageTitle(currentPath, resolvedMessages, pageNumber)}</p>
            </div>
          </div>
          {config.hideDescription
            ? null
            : (
                <div className="border-b px-4 py-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                    DESCRIPTION
                  </p>
                  <div
                    className="prose-telegram max-h-44 overflow-auto text-sm"
                    data-twemoji-scope
                    dangerouslySetInnerHTML={{ __html: channel.descriptionHTML }}
                  />
                </div>
              )}
          <ContentZoom />
          <ContentAlbum />
          <ContentCodeCopy copyLabel={resolvedMessages.codeCopy.copyCode} copiedLabel={resolvedMessages.codeCopy.copied} />
          <ContentTwemoji />
          <ContentVideoPlayer />
          <div>{children}</div>
        </main>

        {footerMarkdownHtml
          ? (
              <footer className="col-start-2 border-t px-4 py-5 text-center text-xs leading-relaxed text-muted-foreground">
                <div className="[overflow-wrap:anywhere] [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: footerMarkdownHtml }} />
              </footer>
            )
          : (
              <footer className="col-start-2 border-t px-4 py-5 text-center text-xs leading-relaxed text-muted-foreground">
                <p>
                  Built with love by
                  {' '}
                  <a href="https://toshiki.dev" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-foreground">Anda Toshiki</a>
                  .
                </p>
                <p className="mt-1.5">
                  <span className="font-mono text-[10px]">
                    v
                    {packageJson.version}
                  </span>
                  {' · Powered by '}
                  <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-foreground">Next.js</a>
                  {', '}
                  <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-foreground">React</a>
                  {', '}
                  <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-foreground">Tailwind CSS</a>
                  {', '}
                  <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-foreground">shadcn/ui</a>
                  {' & '}
                  <a href="https://www.radix-ui.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-foreground">Radix UI</a>
                  .
                </p>
              </footer>
            )}
      </div>
    </div>
  )
}
