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

  if (pathname === `/${DEFAULT_LOCALE}`) {
    const nextUrl = request.nextUrl.clone()
    nextUrl.pathname = '/'
    return NextResponse.redirect(nextUrl)
  }

  if (pathname.startsWith(`/${DEFAULT_LOCALE}/`)) {
    const nextUrl = request.nextUrl.clone()
    const stripped = pathname.replace(new RegExp(`^/${DEFAULT_LOCALE}`), '') || '/'
    nextUrl.pathname = stripped.startsWith('/') ? stripped : `/${stripped}`
    return NextResponse.redirect(nextUrl)
  }

  if (hasLocalePrefix(pathname)) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next).*)'],
}
