// IMPORTANT: UTILITX requires SSR. Do NOT re-add output: 'export' or static export config.
// This app runs in SSR mode on Firebase Functions for dynamic routes and server-side rendering.

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // UTILITX runs in SSR mode on Firebase Functions.
  // Do NOT use output: 'export' (breaks next start and dynamic routes).
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
