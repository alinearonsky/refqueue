import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Self-contained server bundle for Docker (copies only needed node_modules).
  output: 'standalone',
}

export default nextConfig
