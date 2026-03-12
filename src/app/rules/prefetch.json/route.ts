import { SUPPORTED_LOCALES } from '@/lib/i18n'

export const dynamic = 'force-static'

export async function GET() {
  const eagerUrls = SUPPORTED_LOCALES.flatMap(locale => [`/${locale}`, `/${locale}/tags`])
  const postMatchers = SUPPORTED_LOCALES.map(locale => `/${locale}/posts/*`)

  return Response.json(
    {
      prerender: [
        {
          urls: eagerUrls,
          eagerness: 'eager',
        },
      ],
      prefetch: [
        {
          where: { href_matches: postMatchers },
          eagerness: 'moderate',
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/speculationrules+json',
      },
    },
  )
}
