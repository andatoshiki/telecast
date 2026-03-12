import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './src/lib/i18n'

const PUBLIC_FILE_PATTERN = /\.[^/]+$/

function hasLocalePrefix(pathname: string) {
  return SUPPORTED_LOCALES.some(locale => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || PUBLIC_FILE_PATTERN.test(pathname)) {
    return NextResponse.next()
  }

  if (pathname === '/') {
    return NextResponse.next()
  }

  if (hasLocalePrefix(pathname)) {
    return NextResponse.next()
  }

  const nextUrl = request.nextUrl.clone()
  nextUrl.pathname = pathname === '/'
    ? `/${DEFAULT_LOCALE}`
    : `/${DEFAULT_LOCALE}${pathname}`

  return NextResponse.rewrite(nextUrl)
}

export const config = {
  matcher: ['/((?!_next).*)'],
}
