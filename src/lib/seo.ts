export function resolveSeoImageUrl(siteUrl: string, rawImage: string) {
  const image = rawImage.trim()
  if (!image) {
    return ''
  }

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image
  }

  const base = siteUrl.replace(/\/+$/, '')
  const path = image.startsWith('/') ? image : `/${image}`
  return `${base}${path}`
}
