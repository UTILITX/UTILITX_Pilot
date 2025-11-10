/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export for production builds, not dev mode
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
