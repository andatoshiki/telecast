# Telecast

> [!WARNING]
> This documentation is currently a work in progress. Some sections may be incomplete or subject to change.

> A self-hosted, statically-generated microblog that mirrors your Telegram channel into a fast, searchable, and beautifully designed website built with Next.js, React, shadcn/ui, and Tailwind CSS.

[简体中文](./readme-zh.md)

## 1: Why this exists

This is a complete wheel rebuild of [BroadcastChannel](https://github.com/miantiao-me/BroadcastChannel) created by [@miantiao-me](https://github.com/miantiao-me). The original works perfectly well, but I didn't like the UI, it's SSR on Astro (a framework I wasn't familiar with), and I'm a loyal SSG fanboy — static sites are easier to host anywhere, not just Cloudflare Pages or Vercel. So I rebuilt it from scratch in Next.js with DPlayer video playback, a Telegram-native image grid layout, Lunr.js full-text search, and a Twitter-like responsive feed timeline.

**Is it necessary though**? **Absolutely not**, but it's a fun rebuild to adhere with my personal aesthetic visual preference and also a way for me to learn Next.js v16.x.

## 2: Quick start

### 2.1: Requirements

1. Node.js `>=22`
2. pnpm `>=10`

### 2.2: Install and run

```bash
pnpm install
pnpm dev
```

The development server starts on port `4321`.

### 2.3: Build for production

```bash
pnpm build
pnpm start
```

The build command runs `pnpm sync --og-image --favicon` automatically before `next build`, so all generated artifacts are created in a single step.

## 3: Configuration

All configuration lives in a single file: `src/lib/constant.ts`. There are no `.env` files or runtime environment variables. Fork the repo, edit this file, deploy.

### 3.1: Channel and site identity

| Key | Type | Description |
|-----|------|-------------|
| `channel` | `string` | Telegram channel username without `@`. This is the channel whose content is mirrored. |
| `siteUrl` | `string` | Canonical base URL of the published site (e.g. `https://tg.example.com`). Used for SEO, RSS, and sitemap generation. |
| `telegramHost` | `string` | Telegram web host for fetching channel HTML. Default is `t.me`. |
| `locale` | `string` | Default locale. Supported values: `en`, `ja`, `zh`. |
| `timezone` | `string` | IANA timezone for date formatting (e.g. `UTC`, `America/New_York`, `Asia/Tokyo`). |

```ts
channel: 'your_channel',
siteUrl: 'https://tg.example.com',
telegramHost: 't.me',
locale: 'en',
timezone: 'UTC',
```

### 3.2: Social links

| Key | Type | Description |
|-----|------|-------------|
| `website` | `string` | Author or organization website URL. |
| `twitter` | `string` | Twitter/X username only, no URL prefix. |
| `github` | `string` | GitHub username only. |
| `telegram` | `string` | Telegram username for the sidebar link. |
| `mastodon` | `string` | Mastodon handle without protocol (e.g. `mastodon.social/@user`). |
| `bluesky` | `string` | Bluesky handle (e.g. `user.bsky.social`). |

Leave any field as an empty string to hide it from the sidebar.

```ts
website: 'https://example.com',
twitter: 'username',
github: 'username',
telegram: 'username',
mastodon: 'mastodon.social/@username',
bluesky: 'username.bsky.social',
```

### 3.3: Display options

| Key | Type | Description |
|-----|------|-------------|
| `hideDescription` | `boolean` | When `true`, the channel description block below the header is hidden. |
| `reactionsEnabled` | `boolean` | When `true`, Telegram-style emoji reactions are shown on posts. |
| `pwa` | `boolean` | When `true`, enables service worker registration, web app manifest, and offline caching. |
| `customBanner` | `string` | Inline markdown rendered as a banner above the main content. Leave empty to disable. |
| `customFooter` | `string` | Inline markdown that replaces the default footer. Leave empty for the default. |
| `rssBeautify` | `boolean` | When `true`, RSS XML output includes XSLT styling for browser readability. |

```ts
hideDescription: false,
reactionsEnabled: true,
pwa: true,
customBanner: '**Welcome!** [Source on GitHub](https://github.com/you/repo)',
customFooter: '',
rssBeautify: true,
```

### 3.4: Cloudflare image transforms

| Key | Type | Description |
|-----|------|-------------|
| `cloudFlare.transform` | `boolean` | Enable Cloudflare image transform delivery for mirrored images under `/media/*`. |
| `cloudFlare.transformPrefix` | `string` | URL prefix for Cloudflare transforms (e.g. `/cdn-cgi/image/format=auto,quality=85/`). |

This is completely optional. When `cloudFlare.transform` is `true`, the build-time sync rewrites static media paths from their default `/media/…` form to the prefixed version (`/cdn-cgi/image/format=auto,quality=85/media/…`). The rewrite happens at build time only — there is no runtime path conversion. If you are not deploying behind Cloudflare, leave this set to `false` and media paths will stay as plain `/media/*` URLs.

```ts
cloudFlare: {
  transform: false,
  transformPrefix: '/cdn-cgi/image/format=auto,quality=85/',
},
```

### 3.5: Static proxy

| Key | Type | Description |
|-----|------|-------------|
| `staticProxy` | `string` | Proxy base URL for Telegram-origin media at runtime. Leave empty unless you need a runtime proxy. |

Most deployments should leave this empty since media is mirrored locally at build time.

### 3.6: SEO

| Key | Type | Description |
|-----|------|-------------|
| `seo.title` | `string` | Site title for browser tabs and search results. |
| `seo.description` | `string` | Meta description for search engines and social previews. |
| `seo.ogImage` | `string` | Open Graph image path (e.g. `/og-auto.png`). Generated automatically with `--og-image`. |
| `seo.keywords` | `string[]` | Array of SEO keywords for meta tags. |
| `seo.author` | `string` | Author name for meta tags and structured data. |
| `seo.noIndex` | `boolean` | When `true`, emits `noindex` in robots meta. |
| `seo.noFollow` | `boolean` | When `true`, emits `nofollow` in robots meta. |

```ts
seo: {
  title: 'My Telecast',
  description: 'Posts from my Telegram channel.',
  ogImage: '/og-auto.png',
  keywords: ['telegram', 'microblog', 'my-channel'],
  author: 'Your Name',
  noIndex: false,
  noFollow: false,
},
```

### 3.7: Analytics

| Key | Type | Description |
|-----|------|-------------|
| `analytics.googleAnalyticsId` | `string` | Google Analytics 4 measurement ID (e.g. `G-XXXXXXXXXX`). Leave empty to disable. |
| `analytics.umamiScriptUrl` | `string` | Self-hosted Umami analytics script URL. Leave empty to disable. |
| `analytics.umamiWebsiteId` | `string` | Umami website ID for this site. |

```ts
analytics: {
  googleAnalyticsId: '',
  umamiScriptUrl: '',
  umamiWebsiteId: '',
},
```

### 3.8: Build and sync limits

| Key | Type | Description |
|-----|------|-------------|
| `maxPages` | `number` | Maximum Telegram snapshot pages to fetch during sync. Each page contains roughly 20 posts. Default is `50`. |
| `mediaMirror.directory` | `string` | Public URL prefix for mirrored media files (e.g. `/media`). |
| `mediaMirror.userAgent` | `string` | User-Agent string used when downloading media from Telegram. |

```ts
maxPages: 50,
mediaMirror: {
  directory: '/media',
  userAgent: 'TelecastStaticSync/1.0',
},
```

### 3.9: Full example

```ts
export const SITE_CONSTANTS: SiteConstantConfig = {
  channel: 'your_channel',
  locale: 'en',
  timezone: 'UTC',
  siteUrl: 'https://tg.example.com',
  telegramHost: 't.me',
  staticProxy: '',
  cloudFlare: {
    transform: false,
    transformPrefix: '/cdn-cgi/image/format=auto,quality=85/',
  },
  hideDescription: false,
  reactionsEnabled: true,
  pwa: true,
  website: 'https://example.com',
  twitter: 'username',
  github: 'username',
  telegram: 'your_channel',
  mastodon: '',
  bluesky: '',
  customBanner: '',
  customFooter: '',
  rssBeautify: true,
  seo: {
    title: 'My Telecast',
    description: 'Posts from my Telegram channel.',
    ogImage: '/og-auto.png',
    keywords: ['telegram', 'microblog'],
    author: 'Your Name',
    noIndex: false,
    noFollow: false,
  },
  analytics: {
    googleAnalyticsId: '',
    umamiScriptUrl: '',
    umamiWebsiteId: '',
  },
  maxPages: 50,
  mediaMirror: {
    directory: '/media',
    userAgent: 'TelecastStaticSync/1.0',
  },
}
```

## 4: Sync command

### 4.1: Usage

```bash
pnpm sync [flags]
```

### 4.2: Flags

| Flag | Effect |
|------|--------|
| `--og-image` | Generate `public/og-auto.png` from channel metadata. |
| `--favicon` | Generate `favicon.ico`, `favicon.svg`, and PWA icon PNGs from the channel avatar. |

Both flags are used in the default `build` script in `package.json`:

```json
"build": "pnpm sync --og-image --favicon && next build --webpack"
```

> [!NOTE]
> These flags are entirely optional. They auto-generate an Open Graph image and favicons from your Telegram channel avatar so you can deploy without creating any graphics manually. If you prefer to use your own hand-designed OG image or favicon files, remove the corresponding flag from the `build` script in `package.json` and place your custom files in `public/` directly.

### 4.3: Generated artifacts

1. `src/generated/static-snapshot.json` — page data for all routes.
2. `public/search/index.json` — pre-built Lunr full-text search index.
3. `public/media/*` — locally mirrored media files.
4. `public/og-auto.png` — Open Graph image (when `--og-image` is passed).
5. `public/favicon.ico`, `public/favicon.svg`, `public/icon-*.png` — favicons (when `--favicon` is passed).

## 5: Deployment

> [!WARNING]
> This section is currently a work in progress.

## 6: License

This project is licensed under [AGPL-3.0](./LICENSE).

## 7: Page Speed Insights

![Page Speed Metrics](https://cdn.jsdelivr.net/gh/andatoshiki/telecast@master/.github/assets/pagespeed-metrics.svg)
