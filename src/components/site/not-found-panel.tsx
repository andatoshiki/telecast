import type { AppLocale } from '@/lib/i18n'
import type { LocaleMessages } from '@/locales/en'
import { Button } from '@/components/ui/button'
import { localizePath } from '@/lib/i18n'

interface NotFoundPanelProps {
  locale: AppLocale
  messages: LocaleMessages
}

export function NotFoundPanel({ locale, messages }: NotFoundPanelProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[812px] items-center justify-center px-4 py-12">
      <section className="surface w-full max-w-xl p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{messages.notFound.code}</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-foreground">{messages.notFound.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">{messages.notFound.description}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="rounded-full px-5">
            <a href={localizePath(locale, '/')}>
              {messages.notFound.goHome}
            </a>
          </Button>
          <Button asChild variant="outline" className="rounded-full px-5">
            <a href={localizePath(locale, '/search')}>
              {messages.notFound.openSearch}
            </a>
          </Button>
        </div>
      </section>
    </main>
  )
}
