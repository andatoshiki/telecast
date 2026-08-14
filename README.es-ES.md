

# Telecast

> [!WARNING]
> Esta documentación está actualmente en desarrollo. Algunas secciones pueden estar incompletas o sujetas a cambios.

> Un microblog autoalojado y generado estáticamente que espeja tu canal de Telegram en un sitio web rápido, buscable y bellamente diseñado, construido con Next.js, React, shadcn/ui y Tailwind CSS.

[简体中文](./readme-zh.md)

## 1: Por qué existe esto

Esta es una reconstrucción completa de [BroadcastChannel](https://github.com/miantiao-me/BroadcastChannel) creado por [@miantiao-me](https://github.com/miantiao-me). El original funciona perfectamente bien, pero no me gustaba la interfaz de usuario, utiliza SSR en Astro (un framework con el que no estaba familiarizado) y soy un fiel entusiasta del SSG: los sitios estáticos son más fáciles de alojar en cualquier lugar, no solo en Cloudflare Pages o Vercel. Así que lo reconstruí desde cero en Next.js con reproducción de vídeo con DPlayer, una disposición de cuadrícula de imágenes nativa de Telegram, búsqueda de texto completo con Lunr.js y una cronología de publicaciones responsiva similar a Twitter.

**¿Es necesario, entonces**? **Absolutamente no**, pero es un proyecto divertido para ajustarse a mi preferencia estética visual personal y también una forma para mí de aprender Next.js v16.x.

## 2: Inicio rápido

### 2.1: Requisitos

1. Node.js `>=22`
2. pnpm `>=10`

### 2.2: Instalación y ejecución

```bash
pnpm install
pnpm dev
```

El servidor de desarrollo se inicia en el puerto `4321`.

### 2.3: Construir para producción

```bash
pnpm build
pnpm start
```

El comando de compilación ejecuta `pnpm sync --og-image --favicon` automáticamente antes de `next build`, por lo que todos los artefactos generados se crean en un solo paso.

## 3: Configuración

Toda la configuración reside en un solo archivo: `src/lib/constant.ts`. No hay archivos `.env` ni variables de entorno en tiempo de ejecución. Haz un fork del repositorio, edita este archivo y despliega.

### 3.1: Canal e identidad del sitio

| Clave | Tipo | Descripción |
|-----|------|-------------|
| `channel` | `string` | Nombre de usuario del canal de Telegram sin `@`. Este es el canal cuyo contenido se reflejará. |
| `siteUrl` | `string` | URL base canónica del sitio publicado (ej. `https://tg.example.com`). Usado para SEO, RSS y generación del sitemap. |
| `telegramHost` | `string` | Host web de Telegram para obtener el HTML del canal. El predeterminado es `t.me`. |
| `locale` | `string` | Idioma/Región predeterminado. Valores soportados: `en`, `ja`, `zh`. |
| `timezone` | `string` | Zona horaria IANA para el formato de fechas (ej. `UTC`, `America/New_York`, `Asia/Tokyo`). |

```ts
channel: 'your_channel',
siteUrl: 'https://tg.example.com',
telegramHost: 't.me',
locale: 'en',
timezone: 'UTC',
```

### 3.2: Enlaces sociales

| Clave | Tipo | Descripción |
|-----|------|-------------|
| `website` | `string` | URL del sitio web del autor u organización. |
| `twitter` | `string` | Solo nombre de usuario de Twitter/X, sin prefijo de URL. |
| `github` | `string` | Solo nombre de usuario de GitHub. |
| `telegram` | `string` | Nombre de usuario de Telegram para el enlace de la barra lateral. |
| `mastodon` | `string` | Manejador de Mastodon sin protocolo (ej. `mastodon.social/@user`). |
| `bluesky` | `string` | Manejador de Bluesky (ej. `user.bsky.social`). |

Deja cualquier campo como una cadena vacía para ocultarlo de la barra lateral.

```ts
website: 'https://example.com',
twitter: 'username',
github: 'username',
telegram: 'username',
mastodon: 'mastodon.social/@username',
bluesky: 'username.bsky.social',
```

### 3.3: Opciones de visualización

| Clave | Tipo | Descripción |
|-----|------|-------------|
| `hideDescription` | `boolean` | Cuando es `true`, se oculta el bloque de descripción del canal debajo del encabezado. |
| `reactionsEnabled` | `boolean` | Cuando es `true`, se muestran reacciones con emojis estilo Telegram en las publicaciones. |
| `pwa` | `boolean` | Cuando es `true`, habilita el registro del service worker, el manifiesto de la aplicación web y la caché sin conexión. |
| `customBanner` | `string` | Markdown en línea renderizado como un banner por encima del contenido principal. Déjalo vacío para desactivarlo. |
| `customFooter` | `string` | Markdown en línea que reemplaza el pie de página predeterminado. Déjalo vacío para usar el predeterminado. |
| `rssBeautify` | `boolean` | Cuando es `true`, la salida XML de RSS incluye estilos XSLT para una mejor legibilidad en el navegador. |

```ts
hideDescription: false,
reactionsEnabled: true,
pwa: true,
customBanner: '**¡Bienvenido!** [Código en GitHub](https://github.com/you/repo)',
customFooter: '',
rssBeautify: true,
```

### 3.4: Transformaciones de imágenes de Cloudflare

| Clave | Tipo | Descripción |
|-----|------|-------------|
| `cloudFlare.transform` | `boolean` | Habilitar la entrega de transformación de imágenes de Cloudflare para imágenes reflejadas bajo `/media/*`. |
| `cloudFlare.transformPrefix` | `string` | Prefijo de URL para las transformaciones de Cloudflare (ej. `/cdn-cgi/image/format=auto,quality=85/`). |

Esto es completamente opcional. Cuando `cloudFlare.transform` es `true`, la sincronización en tiempo de compilación reescribe las rutas estáticas de medios desde su forma predeterminada `/media/…` a la versión con prefijo (`/cdn-cgi/image/format=auto,quality=85/media/…`). La reescritura ocurre solo en tiempo de compilación: no hay conversión de rutas en tiempo de ejecución. Si no vas a desplegar detrás de Cloudflare, deja esto configurado como `false` y las rutas de medios permanecerán como URLs simples de `/media/*`.

```ts
cloudFlare: {
  transform: false,
  transformPrefix: '/cdn-cgi/image/format=auto,quality=85/',
},
```

### 3.5: Proxy estático

| Clave | Tipo | Descripción |
|-----|------|-------------|
| `staticProxy` | `string` | URL base del proxy para medios de origen Telegram en tiempo de ejecución. Déjalo vacío a menos que necesites un proxy en tiempo de ejecución. |

La mayoría de los despliegues deben dejar esto vacío, ya que los medios se reflejan localmente en tiempo de compilación.

### 3.6: SEO

| Clave | Tipo | Descripción |
|-----|------|-------------|
| `seo.title` | `string` | Título del sitio para las pestañas del navegador y los resultados de búsqueda. |
| `seo.description` | `string` | Descripción meta para motores de búsqueda y vistas previas en redes sociales. |
| `seo.ogImage` | `string` | Ruta de la imagen Open Graph (ej. `/og-auto.png`). Generada automáticamente con `--og-image`. |
| `seo.keywords` | `string[]` | Matriz de palabras clave SEO para etiquetas meta. |
| `seo.author` | `string` | Nombre del autor para etiquetas meta y datos estructurados. |
| `seo.noIndex` | `boolean` | Cuando es `true`, emite `noindex` en la meta de robots. |
| `seo.noFollow` | `boolean` | Cuando es `true`, emite `nofollow` en la meta de robots. |

```ts
seo: {
  title: 'Mi Telecast',
  description: 'Publicaciones de mi canal de Telegram.',
  ogImage: '/og-auto.png',
  keywords: ['telegram', 'microblog', 'mi-canal'],
  author: 'Tu Nombre',
  noIndex: false,
  noFollow: false,
},
```

### 3.7: Análisis

| Clave | Tipo | Descripción |
|-----|------|-------------|
| `analytics.googleAnalyticsId` | `string` | ID de medición de Google Analytics 4 (ej. `G-XXXXXXXXXX`). Déjalo vacío para deshabilitarlo. |
| `analytics.umamiScriptUrl` | `string` | URL del script de análisis autoalojado Umami. Déjalo vacío para deshabilitarlo. |
| `analytics.umamiWebsiteId` | `string` | ID del sitio web de Umami para este sitio. |

```ts
analytics: {
  googleAnalyticsId: '',
  umamiScriptUrl: '',
  umamiWebsiteId: '',
},
```

### 3.8: Límites de compilación y sincronización

| Clave | Tipo | Descripción |
|-----|------|-------------|
| `maxPages` | `number` | Máximo de páginas de instantáneas de Telegram que se obtendrán durante la sincronización. Cada página contiene aproximadamente 20 publicaciones. El predeterminado es `50`. |
| `mediaMirror.directory` | `string` | Prefijo de URL pública para archivos de medios reflejados (ej. `/media`). |
| `mediaMirror.userAgent` | `string` | Cadena User-Agent utilizada al descargar medios de Telegram. |

```ts
maxPages: 50,
mediaMirror: {
  directory: '/media',
  userAgent: 'TelecastStaticSync/1.0',
},
```

### 3.9: Ejemplo completo

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
    title: 'Mi Telecast',
    description: 'Publicaciones de mi canal de Telegram.',
    ogImage: '/og-auto.png',
    keywords: ['telegram', 'microblog'],
    author: 'Tu Nombre',
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

## 4: Comando de sincronización

### 4.1: Uso

```bash
pnpm sync [flags]
```

### 4.2: Banderas

| Bandera | Efecto |
|------|--------|
| `--og-image` | Genera `public/og-auto.png` a partir de los metadatos del canal. |
| `--favicon` | Genera `favicon.ico`, `favicon.svg` e íconos PNG para PWA a partir del avatar del canal. |

Ambas banderas se utilizan en el script predeterminado `build` en `package.json`:

```json
"build": "pnpm sync --og-image --favicon && next build --webpack"
```

> [!NOTE]
> Estas banderas son completamente opcionales. Generan automáticamente una imagen Open Graph y favicons a partir del avatar de tu canal de Telegram para que puedas desplegar sin crear gráficos manualmente. Si prefieres usar tus propios archivos de imagen OG o favicon diseñados a mano, elimina la bandera correspondiente del script `build` en `package.json` y coloca tus archivos personalizados directamente en `public/`.

### 4.3: Artefactos generados

1. `src/generated/static-snapshot.json` — datos de página para todas las rutas.
2. `public/search/index.json` — índice de búsqueda de texto completo con Lunr precompilado.
3. `public/media/*` — archivos de medios reflejados localmente.
4. `public/og-auto.png` — imagen Open Graph (cuando se pasa `--og-image`).
5. `public/favicon.ico`, `public/favicon.svg`, `public/icon-*.png` — favicons (cuando se pasa `--favicon`).

## 5: Despliegue

> [!WARNING]
> Esta sección está actualmente en desarrollo.

## 6: Licencia

Este proyecto está licenciado bajo [AGPL-3.0](./LICENSE).

## 7: Page Speed Insights

![Page Speed Metrics](https://cdn.jsdelivr.net/gh/andatoshiki/telecast@master/.github/assets/pagespeed-metrics.svg)
