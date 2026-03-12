import type { AppLocale } from '@/lib/i18n'
import type { ChannelInfo } from '@/lib/types'
import { ExternalLink } from 'lucide-react'
import { redirect } from 'next/navigation'
import { PageFrame } from '@/components/site/page-frame'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAppConfig } from '@/lib/config'
import { getLocaleMessages, localizePath } from '@/lib/i18n'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'

export async function renderLinksPage(locale: AppLocale) {
  const messages = getLocaleMessages(locale)
  const config = getAppConfig()
  const snapshot = await getStaticSnapshot()
  const channel = snapshot.root as ChannelInfo

  if (config.links.length === 0) {
    redirect(localizePath(locale, '/'))
  }

  return (
    <PageFrame channel={channel} currentPath="/links" locale={locale} messages={messages} currentLocalePath="/links">
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-xl font-semibold">
            <ExternalLink className="h-5 w-5" />
            {messages.nav.links}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {config.links.map(link => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              title={link.title}
              className="inline-flex items-center justify-between rounded-lg border bg-white/70 px-4 py-3 text-sm hover:bg-white"
            >
              <span>{link.title}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </CardContent>
      </Card>
    </PageFrame>
  )
}
