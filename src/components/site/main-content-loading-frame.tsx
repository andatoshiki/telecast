import type { ReactNode } from 'react'
import type { AppLocale } from '@/lib/i18n'
import type { ChannelInfo } from '@/lib/types'
import type { LocaleMessages } from '@/locales/en'
import { getStaticSnapshot } from '@/lib/telegram/static-snapshot'
import { PageFrame } from './page-frame'

interface MainContentLoadingFrameProps {
  currentPath: string
  children: ReactNode
  locale?: AppLocale
  messages?: LocaleMessages
}

export async function MainContentLoadingFrame({ currentPath, children, locale, messages }: MainContentLoadingFrameProps) {
  const snapshot = await getStaticSnapshot()
  const channel = snapshot.root as ChannelInfo

  return (
    <PageFrame channel={channel} currentPath={currentPath} locale={locale} messages={messages} currentLocalePath={currentPath}>
      {children}
    </PageFrame>
  )
}
