import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const outputMode = process.env.NEXT_OUTPUT_MODE === 'export' ? 'export' : 'standalone'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: outputMode,
  trailingSlash: outputMode === 'export',
  pageExtensions: ['ts', 'tsx'],
  turbopack: {
    root: currentDir,
  },
  headers:
    outputMode === 'export'
      ? undefined
      : async () => [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          ],
        },
        {
          source: '/sw.js',
          headers: [
            { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
            { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
            { key: 'Content-Security-Policy', value: 'default-src \'self\'; script-src \'self\'' },
          ],
        },
      ],
}

export default nextConfig
