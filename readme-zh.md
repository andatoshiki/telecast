# Telecast

> 一个独立的 Next.js 微博客应用，可将 Telegram 频道内容镜像为静态快照页面，并支持搜索、标签、RSS 与媒体本地化。

[English](./readme.md)

## 1: 产品概述

### 1.1: 应用定位

Telecast 是基于 Next.js App Router、React 和 shadcn/ui 的独立应用。
它将 Telegram 频道内容转换为可搜索、可部署、可持续更新的网站。

### 1.2: 适用场景

1. 想把 Telegram 频道自动发布到网站的个人与团队。
2. 需要静态优先输出与可预测部署流程的项目。
3. 需要定时刷新内容并降低运维复杂度的站点。

### 1.3: 主要能力

1. Telegram 频道内容抓取与解析。
2. 静态快照生成与基于游标的分页。
3. 媒体文件镜像到 `public/media`。
4. 基于 Lunr 的静态全文搜索索引。
5. `en`、`ja`、`zh` 多语言路由。
6. RSS 与 sitemap 元数据路由。
7. 基于快照数据的标签页与搜索页。

## 2: 技术栈与架构

### 2.1: 技术栈

1. 框架：Next.js 16 App Router。
2. UI：React 19、shadcn/ui、Radix UI、Tailwind CSS。
3. 抓取与解析：`ofetch`、`cheerio`、`lru-cache`。
4. 搜索：Lunr 静态索引。
5. 工具链：TypeScript、ESLint、pnpm。

### 2.2: 内容处理流水线

#### 2.2.1: 抓取阶段

从配置的 Telegram Host 拉取频道页面并解析帖子结构。

#### 2.2.2: 转换阶段

统一处理链接、标签、表情、反应、媒体地址和代码块高亮。

#### 2.2.3: 快照阶段

写入以下文件：

1. `src/generated/static-snapshot.json`
2. `public/search/index.json`

#### 2.2.4: 媒体镜像阶段

下载远端媒体并重写为本地路径 `public/media/*`。

### 2.3: 运行模型

1. 构建前执行同步脚本，生成内容产物。
2. 页面从快照文件读取内容并渲染。
3. 中间件将未带语言前缀的路径重定向到默认语言。

### 2.4: 关键目录

1. `src/app`：页面路由、RSS、sitemap、robots 与多语言页面。
2. `src/lib`：配置、i18n、解析器、快照与搜索逻辑。
3. `src/generated`：生成的快照文件。
4. `scripts`：内容同步与媒体镜像脚本。
5. `public/search`：搜索索引。
6. `public/media`：媒体镜像文件。

## 3: 快速开始

### 3.1: 运行要求

1. Node.js `>=22`。
2. `pnpm` `>=10`。

### 3.2: 安装依赖

```bash
pnpm install
```

### 3.3: 启动开发环境

```bash
pnpm dev
```

默认端口为 `4321`。

### 3.4: 生产构建与启动

```bash
pnpm build
pnpm start
```

### 3.5: 代码检查

```bash
pnpm lint
pnpm lint:fix
```

## 4: 配置方式

### 4.1: 配置入口

本项目主要通过 `src/lib/constant.ts` 中的 `SITE_CONSTANTS` 进行配置，而不是依赖运行时 `.env`。

### 4.2: 站点核心配置

重点字段如下：

1. `channel`
2. `telegramHost`
3. `siteUrl`
4. `locale`
5. `timezone`
6. `commentsEnabled`
7. `reactionsEnabled`
8. `tags`、`links`、`navs`

### 4.3: SEO 与统计配置

1. `seo.title`、`seo.description`、`seo.ogImage`、`seo.canonical`。
2. `seo.robots` 与 `seo.googleBot`。
3. `analytics.googleAnalyticsId`。
4. `analytics.umamiScriptUrl` 与 `analytics.umamiWebsiteId`。

### 4.4: 构建与镜像配置

1. `staticBuild.maxPages`：抓取分页上限。
2. `staticBuild.devRefreshMinutes`：开发模式刷新窗口。
3. `mediaMirror.directory`：媒体本地目录。
4. `mediaMirror.userAgent`：抓取时 User-Agent。

### 4.5: 配置示例

```ts
export const SITE_CONSTANTS = {
  channel: 'your_channel_name',
  telegramHost: 't.me',
  siteUrl: 'https://example.com',
  locale: 'en',
  timezone: 'UTC',
  commentsEnabled: false,
  reactionsEnabled: true,
  staticBuild: {
    maxPages: 50,
    devRefreshMinutes: 45,
  },
  mediaMirror: {
    directory: '/media',
    userAgent: 'TelecastStaticSync/1.0',
  },
}
```

## 5: 同步命令说明

### 5.1: 基础命令

```bash
pnpm sync:content --build
```

### 5.2: 可用参数

1. `--build`：构建模式同步。
2. `--dev`：开发模式同步。
3. `--force`：开发模式下强制执行，不走新鲜度跳过逻辑。
4. `--allow-empty`：允许远端为空快照。

### 5.3: 生成产物

1. `src/generated/static-snapshot.json`
2. `public/search/index.json`
3. `public/media/*`

### 5.4: 新鲜度与回退机制

1. 开发模式可在产物足够新时跳过同步。
2. 远端拉取失败且已有历史快照时，会保留旧快照。
3. 无历史快照且远端为空时，同步会失败，除非使用 `--allow-empty`。

## 6: 路由与公开接口

### 6.1: 主要多语言路由

1. `/{locale}`
2. `/{locale}/before/{cursor}`
3. `/{locale}/after/{cursor}`
4. `/{locale}/posts/{id}`
5. `/{locale}/search`
6. `/{locale}/tags`
7. `/{locale}/links`

### 6.2: 元数据与订阅路由

1. `/robots.txt`
2. `/rss.xml`
3. `/rss.json`
4. `/sitemap.xml`
5. `/rules/prefetch.json`

### 6.3: 语言重定向行为

不带语言前缀的路径会被重定向到默认语言路径。

## 7: 部署

### 7.1: Vercel

1. 导入仓库并按 Next.js 项目部署。
2. 构建时会通过 `prebuild` 自动刷新快照。
3. 每次部署都可得到最新同步产物。

### 7.2: Cloudflare

1. 使用支持 Next.js 输出的部署流程。
2. 确保执行 `pnpm build` 触发同步与产物生成。
3. 校验 `public/media` 与 `public/search/index.json` 被正确发布。

### 7.3: 容器部署

1. 使用项目 Dockerfile 或等价流程构建镜像。
2. 以 Node 服务方式运行，端口 `4321`。
3. 通过定时重部署保持内容更新。

## 8: 定时更新与 cron 策略

### 8.1: 为什么需要定时任务

内容在构建阶段生成，运行时不会自动拉取新数据。

### 8.2: Vercel 方案

1. 创建 Deploy Hook。
2. 创建受保护的 cron API 路由。
3. 通过 Vercel Cron 定时调用该路由。

### 8.3: Cloudflare 方案

1. 创建 Pages Deploy Hook。
2. 创建带 Cron Trigger 的 Worker。
3. 由 Worker 定时调用 Deploy Hook。

### 8.4: 多平台统一方案

通过一个 GitHub Actions 定时工作流统一触发多个平台的 Deploy Hook。

### 8.5: 安全建议

1. cron 路由必须验证密钥。
2. Deploy Hook 放入平台密钥管理。
3. 区分记录同步失败与部署失败日志。

## 9: 运行维护与排障

### 9.1: 快照为空或帖子缺失

1. 检查 `telegramHost` 网络可达性。
2. 检查频道可见性与公开访问状态。
3. 执行 `pnpm sync:content --build` 并查看日志。

### 9.2: 标签数量异常偏少

标签来源于抓取到的帖子标签与配置常量。
抓取失败时会继续沿用旧快照，标签数量可能保持较少。

### 9.3: robots 路由冲突

同一应用中不要同时存在 `public/robots.txt` 与 `src/app/robots.ts`。

### 9.4: Turbopack 异常

若 Turbopack 在目标环境不稳定，可在生产构建改用 webpack 模式。

### 9.5: 图片优化预期

1. 帖子正文图片来自生成后的 HTML 内容。
2. 本地镜像能降低外部依赖。
3. 通过 `dangerouslySetInnerHTML` 注入的图片不会自动套用 `next/image`。

## 10: 维护流程建议

### 10.1: 推荐更新流程

1. 修改常量配置。
2. 执行内容同步。
3. 执行 lint 与 build。
4. 部署上线。

### 10.2: 发布前检查清单

1. 首页与多语言页面可正常访问。
2. 搜索结果可正常返回。
3. 标签页展示符合预期。
4. RSS 与 sitemap 路由可访问。
5. `public/media` 资源可正常加载。

### 10.3: 发布与提交

项目已包含 commitlint 与 changelog 流程，可用于规范化发布。

## 11: 许可证

### 11.1: 许可证说明

本项目采用 AGPL-3.0 许可证。

# 12: 页面速度分析与 SEO

![Page Speed Metrics](https://cdn.jsdelivr.net/gh/andatoshiki/telecast@main/.github/assets/pagespeed-metrics.svg)
