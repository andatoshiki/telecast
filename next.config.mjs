import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  pageExtensions: ['ts', 'tsx'],
  turbopack: {
    root: currentDir,
  },
}

export default nextConfig
