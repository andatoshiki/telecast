# Telecast

> A standalone Next.js microblog app that mirrors Telegram channel content into static snapshot-driven pages with search, tags, RSS, and local media files.

[简体中文](./readme-zh.md)

## 1: Product summary

### 1.1: What this app is

Telecast is a standalone application built with Next.js App Router, React, and shadcn/ui.
It converts Telegram channel content into a fast website that supports multi-locale navigation, static search, and SEO-friendly routes.

### 1.2: Who should use this app

1. Creators who publish to Telegram and want a website without manual reposting.
2. Teams that prefer static-first output with predictable deployment behavior.
3. Operators who need scheduled refresh and low operational overhead.

### 1.3: Main capabilities

1. Telegram channel content ingestion.
2. Static snapshot generation and cursor-based pagination.
3. Local media mirroring into `public/media`.
4. Full-text search index generation with Lunr.
5. Localized routes for `en`, `ja`, and `zh`.
6. RSS and sitemap endpoints.
7. Tag cloud and search pages backed by generated artifacts.

## 2: Technology and architecture

### 2.1: Stack overview

1. Framework: Next.js 16 App Router.
2. UI: React 19, shadcn/ui, Radix UI, Tailwind CSS.
3. Parsing and fetch: `cheerio`, `ofetch`, `lru-cache`.
4. Search: Lunr static index in `public/search/index.json`.
5. Build tooling: TypeScript, ESLint, pnpm.

### 2.2: Content pipeline

#### 2.2.1: Fetch stage

Telegram channel HTML is fetched from the configured host and parsed into post objects.

#### 2.2.2: Transform stage

The parser normalizes links, tags, emojis, reactions, media URLs, and code blocks.

#### 2.2.3: Snapshot stage

The app writes:

1. `src/generated/static-snapshot.json` for page data.
2. `public/search/index.json` for client-side search.

#### 2.2.4: Mirror stage

Remote media URLs are downloaded and rewritten to local paths under `public/media`.

### 2.3: Runtime model

1. Build-time sync prepares data artifacts.
2. App routes read generated snapshot files.
3. Locale middleware redirects non-prefixed URLs to the default locale.

### 2.4: Important directories

1. `src/app`: pages, metadata routes, RSS, sitemap, localized routes.
2. `src/lib`: parser, config, i18n, snapshot logic, search helpers.
3. `src/generated`: generated static snapshot file.
4. `scripts`: sync and media mirror pipeline.
5. `public/search`: generated search index.
6. `public/media`: mirrored media assets.

## 3: Quick start

### 3.1: Requirements

1. Node.js `>=22`.
2. `pnpm` `>=10`.

### 3.2: Install dependencies

```bash
pnpm install
```

### 3.3: Start development server

```bash
pnpm dev
```

The app runs on port `4321`.

### 3.4: Build and start production server

```bash
pnpm build
pnpm start
```

### 3.5: Linting

```bash
pnpm lint
pnpm lint:fix
```

## 4: Configuration

### 4.1: Configuration model

This app is configured through `src/lib/constant.ts` rather than runtime `.env` variables.

### 4.2: Core site constants

Edit these keys in `SITE_CONSTANTS`:

1. `channel`
2. `telegramHost`
3. `siteUrl`
4. `locale`
5. `timezone`
6. `reactionsEnabled`

### 4.3: SEO and analytics constants

1. `seo.title`, `seo.description`, `seo.ogImage`, `seo.keywords`, and `seo.author`.
2. `analytics.googleAnalyticsId`.
3. `analytics.umamiScriptUrl` and `analytics.umamiWebsiteId`.

### 4.4: Static build and media constants

1. `maxPages` controls crawl depth.
2. `mediaMirror.directory` controls local media path.
3. `mediaMirror.userAgent` controls fetch user agent.

### 4.5: Example constants patch

```ts
export const SITE_CONSTANTS = {
  channel: 'your_channel_name',
  telegramHost: 't.me',
  siteUrl: 'https://example.com',
  locale: 'en',
  timezone: 'UTC',
  reactionsEnabled: true,
  maxPages: 50,
  mediaMirror: {
    directory: '/media',
    userAgent: 'TelecastStaticSync/1.0',
  },
}
```

## 5: Sync command reference

### 5.1: Base command

```bash
pnpm sync
```

### 5.2: Available flags

1. `--og-image`: also generate `public/og-auto.png`.

### 5.3: Generated artifacts

1. `src/generated/static-snapshot.json`
2. `public/search/index.json`
3. `public/media/*` files

### 5.4: Sync behavior

1. Sync always fetches fresh remote content and rewrites generated snapshot and index files.
2. If remote fetch returns no posts the sync exits with an error and does not write empty content.

## 6: Routing and public endpoints

### 6.1: Locale routes

1. `/{locale}`
2. `/{locale}/before/{cursor}`
3. `/{locale}/after/{cursor}`
4. `/{locale}/posts/{id}`
5. `/{locale}/search`
6. `/{locale}/tags`

### 6.2: Metadata and feed routes

1. `/robots.txt`
2. `/rss.xml`
3. `/rss.json`
4. `/sitemap.xml`
5. `/rules/prefetch.json`

### 6.3: Locale middleware behavior

Requests without locale prefix are redirected to the default locale route.

## 7: Deployment

### 7.1: Vercel

1. Import the repository into Vercel.
2. Keep default Next.js build behavior.
3. Every deployment rebuilds snapshot data through `prebuild`.

### 7.2: Cloudflare

1. Deploy with a pipeline that supports Next.js server output.
2. Ensure build runs `pnpm build` so sync artifacts are refreshed.
3. Validate that generated `public/media` and `public/search/index.json` are included in deployment output.

### 7.3: Container deployment

1. Build image with project Dockerfile or equivalent.
2. Run Node server on port `4321`.
3. Redeploy on schedule to keep data fresh.

## 8: Scheduled updates and cron strategy

### 8.1: Why scheduling is required

Data is generated at build time, so updates require a new deployment.

### 8.2: Vercel scheduling pattern

1. Create a deploy hook.
2. Create a protected cron endpoint.
3. Configure Vercel cron to call that endpoint.

### 8.3: Cloudflare scheduling pattern

1. Create a Pages deploy hook.
2. Create a Worker with a Cron Trigger.
3. Have the Worker call the deploy hook URL.

### 8.4: Unified multi-platform pattern

Use one GitHub Actions scheduled workflow to trigger both deploy hooks.

### 8.5: Security recommendations

1. Protect cron endpoints with a shared secret.
2. Keep deploy hooks in platform secrets.
3. Log sync failures and redeploy failures separately.

## 9: Operations and troubleshooting

### 9.1: Empty snapshot or missing posts

1. Check network access to `telegramHost`.
2. Verify channel visibility and accessibility.
3. Run `pnpm sync` and inspect logs.

### 9.2: Too few tags

Tags are extracted only from fetched posts.
If fetch fails sync exits with an error and generated content stays unchanged.

### 9.3: Robots route conflict

Do not define both `public/robots.txt` and `src/app/robots.ts` for the same app.

### 9.4: Turbopack panic

If Turbopack crashes in your environment, use webpack build mode for production stability.

### 9.5: Image optimization expectations

1. Post-body images are rendered from generated HTML.
2. Local mirroring reduces external dependencies.
3. `next/image` is not automatic for HTML injected through `dangerouslySetInnerHTML`.

## 10: Maintenance workflow

### 10.1: Recommended update cycle

1. Update constants.
2. Run sync.
3. Run lint and build.
4. Deploy.

### 10.2: Validation checklist

1. Home and locale routes load correctly.
2. Search results are available.
3. Tag page reflects expected hashtags.
4. RSS and sitemap endpoints are valid.
5. Mirrored media loads from `public/media`.

### 10.3: Release and commits

Project scripts include commitlint and changelog tooling for conventional release workflow.

## 11: License

### 11.1: License terms

This project is licensed under AGPL-3.0.

# 12: Page Speed Insights and SEO

![Page Speed Metrics](.github/assets/pagespeed-metrics.svg)
