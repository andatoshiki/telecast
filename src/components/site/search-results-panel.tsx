'use client'

import type { Index } from 'lunr'
import type { ReactNode } from 'react'
import type { AppLocale } from '@/lib/i18n'
import type { LocaleMessages } from '@/locales/en'
import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { localizePath } from '@/lib/i18n'

interface SearchIndexDocument {
  id: string
  title: string
  text: string
  tags: string
  datetime: string
}

interface SearchIndexPayload {
  documents?: SearchIndexDocument[]
  index?: unknown
}

interface SearchResult {
  score: number
  doc: SearchIndexDocument
}

const MAX_SEARCH_RESULTS = 40

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
  const end = Math.min(normalizedText.length, firstMatchIndex + 120)
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

function formatDatetime(value: string, locale: AppLocale) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

interface SearchResultsPanelProps {
  locale: AppLocale
  messages: LocaleMessages
}

export function SearchResultsPanel({ locale, messages }: SearchResultsPanelProps) {
  const searchParams = useSearchParams()
  const [documents, setDocuments] = useState<SearchIndexDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [indexVersion, setIndexVersion] = useState(0)
  const indexRef = useRef<Index | null>(null)
  const trailingWildcardRef = useRef(0)

  const query = (searchParams.get('q') || '').trim()
  const terms = useMemo(() => normalizeTerms(query), [query])
  const docsById = useMemo(() => new Map(documents.map(doc => [doc.id, doc])), [documents])

  useEffect(() => {
    let cancelled = false

    async function loadIndex() {
      setLoading(true)
      setError('')

      try {
        const [{ default: lunr }, response] = await Promise.all([
          import('lunr'),
          fetch('/search/index.json', { cache: 'force-cache' }),
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

        if (cancelled) {
          return
        }

        trailingWildcardRef.current = lunr.Query.wildcard.TRAILING
        indexRef.current = index
        setDocuments(docs)
        setIndexVersion(version => version + 1)
      }
      catch (indexError) {
        if (!cancelled) {
          console.error('[search-results] Unable to initialize client search index', indexError)
          setError(messages.searchPanel.indexUnavailable)
        }
      }
      finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadIndex()

    return () => {
      cancelled = true
    }
  }, [messages.searchPanel.indexUnavailable])

  const results = useMemo<SearchResult[]>(() => {
    if (!indexRef.current || terms.length === 0) {
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
      .filter((item): item is SearchResult => Boolean(item))
      .slice(0, MAX_SEARCH_RESULTS)
  }, [docsById, indexVersion, terms])

  let content: ReactNode = null

  if (loading) {
    content = (
      <div className="px-4 pb-6 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {messages.searchPanel.loadingIndex}
        </span>
      </div>
    )
  }
  else if (error) {
    content = <div className="px-4 pb-6 text-sm text-destructive">{error}</div>
  }
  else if (!query) {
    content = (
      <div className="px-4 pb-6 text-sm text-muted-foreground">
        {messages.searchPanel.emptyQueryPrefix}
        {' '}
        <code className="rounded bg-muted px-1 py-0.5">{localizePath(locale, '/search?q=dev')}</code>
        {messages.searchPanel.emptyQuerySuffix}
      </div>
    )
  }
  else if (terms.length === 0 || results.length === 0) {
    content = <div className="px-4 pb-6 text-sm text-muted-foreground">{messages.searchPanel.noMatches}</div>
  }
  else {
    content = (
      <div className="border-b">
        {results.map((result, index) => {
          const title = result.doc.title || `${messages.searchPanel.defaultPostTitlePrefix} ${result.doc.id}`
          const snippet = buildSnippet(result.doc.text || result.doc.title || '', terms)
          return (
            <article key={result.doc.id} className="border-b px-4 py-4">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <a href={localizePath(locale, `/posts/${result.doc.id}`)} className="link-smooth text-sm font-semibold text-foreground">
                  {renderHighlightedText(title, terms)}
                </a>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDatetime(result.doc.datetime, locale)}</span>
              </div>

              {snippet
                ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {renderHighlightedText(snippet, terms)}
                    </p>
                  )
                : null}

              <div className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80">
                {messages.searchPanel.matchLabel}
                {' '}
                {(index + 1).toString().padStart(2, '0')}
              </div>
            </article>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className="mb-1 px-4 py-3 text-sm uppercase tracking-[0.16em] text-muted-foreground">
        {messages.searchPanel.heading}
        :
        {' '}
        {query || messages.searchPanel.headingFallback}
      </div>
      {content}
    </>
  )
}
