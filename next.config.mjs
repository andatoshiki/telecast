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
}

export default nextConfig
