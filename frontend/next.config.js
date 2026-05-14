/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://dclaw-time-calculator-backend:8095'

const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/health/:path*', destination: `${backendUrl}/health/:path*` },
    ]
  },
}

module.exports = nextConfig
