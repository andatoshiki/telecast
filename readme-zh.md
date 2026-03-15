# Telecast

> [!WARNING]
> 本文档目前仍在编写中，部分章节可能不完整或存在变动。

> 一个自托管的静态生成微博客，将 Telegram 频道镜像为快速、可搜索、UI 精美的网站，基于 Next.js、React、shadcn/ui 和 Tailwind CSS 构建。

[English](./readme.md)

## 1: 为什么做这个项目

这是对 [BroadcastChannel](https://github.com/miantiao-me/BroadcastChannel)（由 [@miantiao-me](https://github.com/miantiao-me) 开发）的完全重写。原项目本身运行得很好，但我不太喜欢它的 UI 设计，而且原项目是基于 Astro 的 SSR 方案（一个我完全不熟悉的框架），而我是一个坚定的 SSG 忠实拥护者——静态站点可以更轻松地部署到各种平台，而不仅限于 Cloudflare Pages 或 Vercel。所以我用 Next.js 从零重写，加入了 DPlayer 视频播放、仿 Telegram 原生的图片网格布局、基于 Lunr.js 的全文搜索，以及类 Twitter 的响应式时间线。

**有必要吗**？**完全没有**，但这是一次有趣的重写，既符合我个人的审美偏好，也是学习 Next.js v16.x 的方式。

## 2: 快速开始

### 2.1: 运行要求

1. Node.js `>=22`
2. pnpm `>=10`

### 2.2: 安装并运行

```bash
pnpm install
pnpm dev
```

开发服务器默认在端口 `4321` 启动。

### 2.3: 生产构建

```bash
pnpm build
pnpm start
```

构建命令会在 `next build` 之前自动执行 `pnpm sync --og-image --favicon`，所有生成产物一步完成。

## 3: 配置

所有配置集中在一个文件：`src/lib/constant.ts`。没有 `.env` 文件或运行时环境变量。Fork 仓库，编辑此文件，直接部署。

### 3.1: 频道与站点身份

| 键 | 类型 | 说明 |
|----|------|------|
| `channel` | `string` | Telegram 频道用户名，不带 `@`。要镜像的目标频道。 |
| `siteUrl` | `string` | 站点的规范基础 URL（如 `https://tg.example.com`），用于 SEO、RSS 和 sitemap。 |
| `telegramHost` | `string` | Telegram 网页主机，用于抓取频道 HTML。默认为 `t.me`。 |
| `locale` | `string` | 默认语言。支持的值：`en`、`ja`、`zh`。 |
| `timezone` | `string` | IANA 时区，用于日期格式化（如 `UTC`、`America/New_York`、`Asia/Tokyo`）。 |

```ts
channel: 'your_channel',
siteUrl: 'https://tg.example.com',
telegramHost: 't.me',
locale: 'en',
timezone: 'UTC',
```

### 3.2: 社交链接

| 键 | 类型 | 说明 |
|----|------|------|
| `website` | `string` | 作者或组织的网站 URL。 |
| `twitter` | `string` | Twitter/X 用户名，不含 URL 前缀。 |
| `github` | `string` | GitHub 用户名。 |
| `telegram` | `string` | 侧边栏 Telegram 链接的用户名。 |
| `mastodon` | `string` | Mastodon 地址，不含协议（如 `mastodon.social/@user`）。 |
| `bluesky` | `string` | Bluesky 地址（如 `user.bsky.social`）。 |

任何字段留空即可隐藏对应的侧边栏链接。

```ts
website: 'https://example.com',
twitter: 'username',
github: 'username',
telegram: 'username',
mastodon: 'mastodon.social/@username',
bluesky: 'username.bsky.social',
```

### 3.3: 显示选项

| 键 | 类型 | 说明 |
|----|------|------|
| `hideDescription` | `boolean` | 为 `true` 时隐藏头部下方的频道描述。 |
| `reactionsEnabled` | `boolean` | 为 `true` 时显示 Telegram 风格的 emoji 反应。 |
| `pwa` | `boolean` | 为 `true` 时启用 Service Worker 注册、Web App Manifest 和离线缓存。 |
| `customBanner` | `string` | 在主内容上方渲染的 Markdown 横幅。留空禁用。 |
| `customFooter` | `string` | 替换默认页脚的 Markdown 内容。留空使用默认页脚。 |
| `rssBeautify` | `boolean` | 为 `true` 时 RSS XML 输出包含 XSLT 样式，方便浏览器阅读。 |

```ts
hideDescription: false,
reactionsEnabled: true,
pwa: true,
customBanner: '**欢迎！** [GitHub 源码](https://github.com/you/repo)',
customFooter: '',
rssBeautify: true,
```

### 3.4: Cloudflare 图片转换

| 键 | 类型 | 说明 |
|----|------|------|
| `cloudFlare.transform` | `boolean` | 为 `/media/*` 下的镜像图片启用 Cloudflare 图片转换。 |
| `cloudFlare.transformPrefix` | `string` | Cloudflare 转换 URL 前缀（如 `/cdn-cgi/image/format=auto,quality=85/`）。 |

此配置完全可选。当 `cloudFlare.transform` 为 `true` 时，构建同步会将静态媒体路径从默认的 `/media/…` 改写为带前缀的版本（`/cdn-cgi/image/format=auto,quality=85/media/…`）。改写仅发生在构建时，没有运行时路径转换。如果不在 Cloudflare 后部署，保持 `false` 即可，媒体路径将保持为普通的 `/media/*` URL。

```ts
cloudFlare: {
  transform: false,
  transformPrefix: '/cdn-cgi/image/format=auto,quality=85/',
},
```

### 3.5: 静态代理

| 键 | 类型 | 说明 |
|----|------|------|
| `staticProxy` | `string` | Telegram 来源媒体的运行时代理 URL。除非需要运行时代理，否则留空。 |

大多数部署应留空，因为媒体在构建时已本地镜像。

### 3.6: SEO

| 键 | 类型 | 说明 |
|----|------|------|
| `seo.title` | `string` | 浏览器标签页和搜索结果中显示的站点标题。 |
| `seo.description` | `string` | 搜索引擎和社交预览的 Meta 描述。 |
| `seo.ogImage` | `string` | Open Graph 图片路径（如 `/og-auto.png`）。可通过 `--og-image` 自动生成。 |
| `seo.keywords` | `string[]` | SEO 关键词数组。 |
| `seo.author` | `string` | 用于 Meta 标签和结构化数据的作者名。 |
| `seo.noIndex` | `boolean` | 为 `true` 时在 robots meta 中输出 `noindex`。 |
| `seo.noFollow` | `boolean` | 为 `true` 时在 robots meta 中输出 `nofollow`。 |

```ts
seo: {
  title: 'My Telecast',
  description: '来自我的 Telegram 频道的帖子。',
  ogImage: '/og-auto.png',
  keywords: ['telegram', 'microblog', 'my-channel'],
  author: 'Your Name',
  noIndex: false,
  noFollow: false,
},
```

### 3.7: 统计分析

| 键 | 类型 | 说明 |
|----|------|------|
| `analytics.googleAnalyticsId` | `string` | Google Analytics 4 衡量 ID（如 `G-XXXXXXXXXX`）。留空禁用。 |
| `analytics.umamiScriptUrl` | `string` | 自托管 Umami 统计脚本 URL。留空禁用。 |
| `analytics.umamiWebsiteId` | `string` | Umami 网站 ID。 |

```ts
analytics: {
  googleAnalyticsId: '',
  umamiScriptUrl: '',
  umamiWebsiteId: '',
},
```

### 3.8: 构建与同步限制

| 键 | 类型 | 说明 |
|----|------|------|
| `maxPages` | `number` | 同步时抓取的最大 Telegram 快照页数。每页约 20 条帖子。默认 `50`。 |
| `mediaMirror.directory` | `string` | 镜像媒体文件的公共 URL 前缀（如 `/media`）。 |
| `mediaMirror.userAgent` | `string` | 从 Telegram 下载媒体时的 User-Agent 字符串。 |

```ts
maxPages: 50,
mediaMirror: {
  directory: '/media',
  userAgent: 'TelecastStaticSync/1.0',
},
```

### 3.9: 完整示例

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
    description: '来自我的 Telegram 频道的帖子。',
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

## 4: 同步命令

### 4.1: 用法

```bash
pnpm sync [flags]
```

### 4.2: 参数

| 参数 | 效果 |
|------|------|
| `--og-image` | 从频道元数据生成 `public/og-auto.png`。 |
| `--favicon` | 从频道头像生成 `favicon.ico`、`favicon.svg` 和 PWA 图标 PNG。 |

两个参数都在 `package.json` 的默认 `build` 脚本中使用：

```json
"build": "pnpm sync --og-image --favicon && next build --webpack"
```

> [!NOTE]
> 这两个参数完全可选。它们会从 Telegram 频道头像自动生成 Open Graph 图片和 favicon，无需手动制作任何图形素材即可部署。如果你更喜欢使用自己设计的 OG 图片或 favicon 文件，只需从 `package.json` 的 `build` 脚本中移除对应参数，并将自定义文件放入 `public/` 目录即可。

### 4.3: 生成产物

1. `src/generated/static-snapshot.json` — 所有路由的页面数据。
2. `public/search/index.json` — 预构建的 Lunr 全文搜索索引。
3. `public/media/*` — 本地镜像的媒体文件。
4. `public/og-auto.png` — Open Graph 图片（传入 `--og-image` 时生成）。
5. `public/favicon.ico`、`public/favicon.svg`、`public/icon-*.png` — favicon（传入 `--favicon` 时生成）。

## 5: 部署

> [!WARNING]
> 本章节目前仍在编写中。

## 6: 许可证

本项目采用 [AGPL-3.0](./LICENSE) 许可证。

## 7: 页面速度分析

![Page Speed Metrics](https://cdn.jsdelivr.net/gh/andatoshiki/telecast@master/.github/assets/pagespeed-metrics.svg)
