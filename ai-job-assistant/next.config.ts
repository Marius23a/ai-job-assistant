import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  // pdf-parse & mammoth are Node libs — keep them out of the bundle
  serverExternalPackages: ['pdf-parse', 'mammoth'],
}
export default nextConfig
