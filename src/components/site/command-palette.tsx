'use client'

import type { Index } from 'lunr'
import type { AppLocale } from '@/lib/i18n'
import type { NavLink } from '@/lib/types'
import type { LocaleMessages } from '@/locales/en'
import {
  ArrowUpRight,
  Compass,
  CornerUpLeft,
  Github,
  House,
  Link2,
  Loader2,
  Rss,
  Search,
  Send,
  Sparkles,
  Tag,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { localizePath, stripLocalePrefix } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface SearchIndexDocument {
  id: string
  title: string
  text: string
  tags: string
  datetime: string
}

interface SearchResult {
  score: number
  doc: SearchIndexDocument
}

interface SearchIndexPayload {
  documents?: SearchIndexDocument[]
  index?: unknown
}

interface CommandPaletteProps {
  navItems: NavLink[]
  internalNavItems: NavLink[]
  customNavItems: NavLink[]
  tags?: string[]
  locale: AppLocale
  messages: LocaleMessages
  triggerMode?: 'full' | 'icon'
  triggerClassName?: string
}

type PaletteMode = 'navigate' | 'search'

const MAX_SEARCH_RESULTS = 12

function normalizeTerms(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map(term => term.trim().replace(/^#+/, '').toLowerCase())
    .filter(Boolean)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSnippet(text: string, terms: string[]) {
  const normalizedText = text.replace(/\s+/g, ' ').trim()
  if (!normalizedText) {
    return ''
  }

  if (terms.length === 0) {
    return normalizedText.length > 160
      ? `${normalizedText.slice(0, 160).trimEnd()}...`
      : normalizedText
  }

  const lowered = normalizedText.toLowerCase()
  let firstMatchIndex = -1

  for (const term of terms) {
    const nextMatchIndex = lowered.indexOf(term.toLowerCase())
    if (nextMatchIndex !== -1 && (firstMatchIndex === -1 || nextMatchIndex < firstMatchIndex)) {
      firstMatchIndex = nextMatchIndex
    }
  }

  if (firstMatchIndex === -1) {
    return normalizedText.length > 160
      ? `${normalizedText.slice(0, 160).trimEnd()}...`
      : normalizedText
  }

  const start = Math.max(0, firstMatchIndex - 56)
  const end = Math.min(normalizedText.length, firstMatchIndex + 112)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < normalizedText.length ? '...' : ''
  return `${prefix}${normalizedText.slice(start, end).trim()}${suffix}`
}

function renderHighlightedText(value: string, terms: string[]) {
  if (!value) {
    return value
  }

  const uniqueTerms = [...new Set(terms.map(term => term.toLowerCase()).filter(Boolean))]
    .sort((left, right) => right.length - left.length)

  if (uniqueTerms.length === 0) {
    return value
  }

  const matcher = new RegExp(`(${uniqueTerms.map(escapeRegExp).join('|')})`, 'gi')
  const parts = value.split(matcher)

  return parts.map((part, index) => {
    if (!part) {
      return null
    }

    const isMatched = uniqueTerms.includes(part.toLowerCase())
    return isMatched
      ? <mark key={`${part}-${index}`} className="command-highlight">{part}</mark>
      : <span key={`${part}-${index}`}>{part}</span>
  })
}

function getNavIcon(href: string) {
  if (href === '/') {
    return <House className="h-4 w-4" />
  }
  if (href === '/tags') {
    return <Tag className="h-4 w-4" />
  }
  if (href === '/links') {
    return <Link2 className="h-4 w-4" />
  }
  return <Compass className="h-4 w-4" />
}

function getExternalIcon(item: NavLink) {
  if (
    item.href === '/rss.xml'
    || /(?:^|[/.?&=_-])(?:rss|atom|feed)(?:\.xml)?(?:$|[/?#&=_-])/i.test(item.href)
    || /\b(?:rss|atom|feed)\b/i.test(item.title)
  ) {
    return <Rss className="h-4 w-4" />
  }
  if (/^https?:\/\/(?:www\.)?github\.com\//i.test(item.href)) {
    return <Github className="h-4 w-4" />
  }
  if (/^https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\//i.test(item.href)) {
    return <Send className="h-4 w-4" />
  }
  return <ArrowUpRight className="h-4 w-4" />
}

export function CommandPalette({
  navItems,
  internalNavItems,
  customNavItems,
  tags = [],
  locale,
  messages,
  triggerMode = 'full',
  triggerClassName,
}: CommandPaletteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<PaletteMode>('navigate')
  const [query, setQuery] = useState('')
  const [documents, setDocuments] = useState<SearchIndexDocument[]>([])
  const [loadingIndex, setLoadingIndex] = useState(false)
  const [indexError, setIndexError] = useState('')
  const [indexVersion, setIndexVersion] = useState(0)
  const indexRef = useRef<Index | null>(null)
  const trailingWildcardRef = useRef(0)

  const terms = useMemo(() => normalizeTerms(query), [query])
  const docsById = useMemo(() => new Map(documents.map(doc => [doc.id, doc])), [documents])
  const isSearchRoute = stripLocalePrefix(pathname).startsWith('/search')

  const closePalette = useCallback(() => {
    setOpen(false)
    setMode('navigate')
    setQuery('')
  }, [])

  useEffect(() => {
    closePalette()
  }, [pathname, closePalette])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(current => !current)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const ensureSearchIndex = useCallback(async () => {
    if (indexRef.current && documents.length > 0) {
      return
    }

    setLoadingIndex(true)
    setIndexError('')

    try {
      const [{ default: lunr }, response] = await Promise.all([
        import('lunr'),
        fetch('/search/index.json', {
          cache: 'force-cache',
        }),
      ])

      if (!response.ok) {
        throw new Error(`Failed to fetch index: ${response.status}`)
      }

      const payload = await response.json() as SearchIndexPayload
      const docs = Array.isArray(payload.documents) ? payload.documents : []
      const index = payload.index
        ? lunr.Index.load(payload.index as never)
        : lunr(function buildIndex() {
            this.ref('id')
            this.field('title', { boost: 8 })
            this.field('text', { boost: 3 })
            this.field('tags', { boost: 14 })

            for (const doc of docs) {
              this.add(doc)
            }
          })

      trailingWildcardRef.current = lunr.Query.wildcard.TRAILING
      indexRef.current = index
      setDocuments(docs)
      setIndexVersion(version => version + 1)
    }
    catch (error) {
      console.error('Unable to initialize client search index', error)
      setIndexError(messages.commandPalette.indexUnavailable)
    }
    finally {
      setLoadingIndex(false)
    }
  }, [documents.length, messages.commandPalette.indexUnavailable])

  useEffect(() => {
    if (open && mode === 'search') {
      void ensureSearchIndex()
    }
  }, [open, mode, ensureSearchIndex])

  const searchResults = useMemo<SearchResult[]>(() => {
    if (mode !== 'search' || terms.length === 0 || !indexRef.current) {
      return []
    }

    const trailingWildcard = trailingWildcardRef.current
    const matches = indexRef.current.query((builder) => {
      for (const term of terms) {
        builder.term(term, {
          fields: ['tags'],
          wildcard: trailingWildcard,
          boost: 14,
        })
        builder.term(term, {
          fields: ['title'],
          wildcard: trailingWildcard,
          boost: 8,
        })
        builder.term(term, {
          fields: ['text'],
          wildcard: trailingWildcard,
          boost: 3,
        })
      }
    })

    return matches
      .map((match) => {
        const doc = docsById.get(match.ref)
        if (!doc) {
          return null
        }
        return {
          score: match.score,
          doc,
        }
      })
      .filter((result): result is SearchResult => Boolean(result))
      .slice(0, MAX_SEARCH_RESULTS)
  }, [docsById, mode, terms, indexVersion])

  const openSearchMode = useCallback(() => {
    setMode('search')
    setQuery('')
    void ensureSearchIndex()
  }, [ensureSearchIndex])

  const openInternal = useCallback((href: string) => {
    router.push(localizePath(locale, href))
    closePalette()
  }, [router, closePalette, locale])

  const openExternal = useCallback((href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer')
    closePalette()
  }, [closePalette])

  return (
    <>
      <Button
        type="button"
        variant={triggerMode === 'icon' ? 'ghost' : 'outline'}
        className={cn(
          triggerMode === 'icon'
            ? 'h-12 w-12 shrink-0 rounded-full bg-transparent text-muted-foreground transition-colors duration-200 hover:bg-muted/70 hover:text-foreground focus-visible:bg-muted/70 data-[state=open]:bg-muted/70 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.9]'
            : 'h-12 w-full min-w-0 justify-between overflow-hidden rounded-2xl border-border/80 bg-muted/20 px-4 text-sm font-normal text-muted-foreground hover:bg-muted/30',
          triggerMode === 'icon' && (open || isSearchRoute) && 'bg-muted/70 text-foreground [&_svg]:fill-current',
          triggerClassName,
        )}
        onClick={() => setOpen(true)}
        aria-label={messages.commandPalette.dialogTitle}
      >
        {triggerMode === 'icon'
          ? (
              <>
                <Search className="h-6 w-6" />
                <span className="sr-only">{messages.commandPalette.openButton}</span>
              </>
            )
          : (
              <>
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span className="truncate">{messages.commandPalette.openButton}</span>
                </span>
                <kbd className="ml-3 inline-flex h-8 shrink-0 items-center rounded-lg border bg-background px-2.5 text-xs font-semibold text-muted-foreground">
                  ⌘
                  {' '}
                  K
                </kbd>
              </>
            )}
      </Button>

      <CommandDialog
        title={messages.commandPalette.dialogTitle}
        closeLabel={messages.commandPalette.closeDialog}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) {
            setMode('navigate')
            setQuery('')
          }
        }}
        commandProps={{ shouldFilter: false }}
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={mode === 'search' ? messages.commandPalette.inputSearch : messages.commandPalette.inputCommand}
        />

        <CommandList>
          {mode === 'navigate'
            ? (
                <>
                  <CommandGroup heading={messages.commandPalette.groupActions}>
                    <CommandItem onSelect={openSearchMode}>
                      <Sparkles className="h-4 w-4" />
                      {messages.commandPalette.searchPostsAction}
                      <CommandShortcut>{messages.commandPalette.enterKey}</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>

                  <CommandSeparator />

                  <CommandGroup heading={messages.commandPalette.groupNavigate}>
                    {navItems.map(item => (
                      <CommandItem
                        key={`nav-${item.href}`}
                        onSelect={() => openInternal(item.href)}
                      >
                        {getNavIcon(item.href)}
                        {item.title}
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  {tags.length > 0
                    ? (
                        <>
                          <CommandSeparator />
                          <CommandGroup heading={messages.nav.tags}>
                            {tags.map(tag => (
                              <CommandItem
                                key={`tag-${tag}`}
                                onSelect={() => openInternal(`/search?q=${encodeURIComponent(`#${tag}`)}`)}
                              >
                                <Tag className="h-4 w-4" />
                                {tag}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )
                    : null}

                  {internalNavItems.length > 0
                    ? (
                        <>
                          <CommandSeparator />
                          <CommandGroup heading={messages.commandPalette.groupInternal}>
                            {internalNavItems.map(item => (
                              <CommandItem
                                key={`internal-${item.title}-${item.href}`}
                                onSelect={() => openExternal(item.href)}
                              >
                                {getExternalIcon(item)}
                                {item.title}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )
                    : null}

                  {customNavItems.length > 0
                    ? (
                        <>
                          <CommandSeparator />
                          <CommandGroup heading={messages.commandPalette.groupCustom}>
                            {customNavItems.map(item => (
                              <CommandItem
                                key={`custom-${item.title}-${item.href}`}
                                onSelect={() => openExternal(item.href)}
                              >
                                {getExternalIcon(item)}
                                {item.title}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )
                    : null}
                </>
              )
            : (
                <>
                  <CommandGroup heading={messages.commandPalette.groupSearch}>
                    <CommandItem
                      onSelect={() => {
                        setMode('navigate')
                        setQuery('')
                      }}
                    >
                      <CornerUpLeft className="h-4 w-4" />
                      {messages.commandPalette.backToCommands}
                    </CommandItem>
                  </CommandGroup>

                  <CommandSeparator />

                  {loadingIndex
                    ? (
                        <CommandGroup heading={messages.commandPalette.groupResults}>
                          <CommandItem disabled>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {messages.commandPalette.buildingIndex}
                          </CommandItem>
                        </CommandGroup>
                      )
                    : null}

                  {!loadingIndex && indexError
                    ? (
                        <CommandGroup heading={messages.commandPalette.groupResults}>
                          <CommandItem disabled>{indexError}</CommandItem>
                        </CommandGroup>
                      )
                    : null}

                  {!loadingIndex && !indexError && terms.length === 0
                    ? (
                        <CommandEmpty>{messages.commandPalette.emptySearchHint}</CommandEmpty>
                      )
                    : null}

                  {!loadingIndex && !indexError && terms.length > 0 && searchResults.length === 0
                    ? (
                        <CommandEmpty>{messages.commandPalette.noMatches}</CommandEmpty>
                      )
                    : null}

                  {!loadingIndex && !indexError && searchResults.length > 0
                    ? (
                        <CommandGroup heading={messages.commandPalette.groupResults}>
                          {searchResults.map(({ doc, score }) => (
                            <CommandItem
                              key={`result-${doc.id}`}
                              value={`${doc.id}-${doc.title}-${score}`}
                              onSelect={() => openInternal(`/posts/${doc.id}`)}
                              className="items-start py-2.5"
                            >
                              <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <p className="line-clamp-1 text-sm font-semibold text-foreground">
                                  {renderHighlightedText(doc.title || `${messages.searchPanel.defaultPostTitlePrefix} #${doc.id}`, terms)}
                                </p>
                                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                                  {renderHighlightedText(buildSnippet(doc.text, terms), terms)}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )
                    : null}

                  {!loadingIndex && !indexError && terms.length > 0
                    ? (
                        <>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem onSelect={() => openInternal(`/search?q=${encodeURIComponent(query.trim())}`)}>
                              <Search className="h-4 w-4" />
                              {messages.commandPalette.openFullResults}
                            </CommandItem>
                          </CommandGroup>
                        </>
                      )
                    : null}
                </>
              )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
