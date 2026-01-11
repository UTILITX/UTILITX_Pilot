/**
 * UTILITX Next.js Configuration
 * 
 * IMPORTANT: This app requires SSR (Server-Side Rendering) for Firebase Functions on Node 20.
 * 
 * BLOCKED CONFIGURATIONS (DO NOT USE):
 * - output: 'export' - BREAKS SSR and dynamic routes
 * - static export mode - BREAKS next start and Firebase Functions
 * 
 * REQUIRED FOR:
 * - Dynamic routes (/share/[id], /contribute/[id], etc.)
 * - Server-side rendering on Firebase Functions (Node 20)
 * - Outbound API calls (Supabase, Esri, GPT, Flask) - requires Blaze plan
 * - Next.js API routes (/api/*)
 * 
 * FIREBASE BLAZE PLAN + NODE 20:
 * - Outbound API calls from Functions are allowed
 * - SSR is fully supported on Node 20 runtime
 * - Unlimited HTTPS Functions
 * - Supabase, Esri, GPT, and Flask integrations work in production
 * 
 * GUARDRAILS:
 * - DO NOT re-add output: 'export' - this breaks SSR and Firebase Functions
 * - Firebase Functions uses Node 20 (Node 18 was decommissioned)
 * - All routes are handled by nextApp function in firebase.json
 */

import { withSentryConfig } from '@sentry/nextjs';

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
  'block-all-mixed-content',
  "script-src 'self' https://js.arcgis.com https://browser.sentry-cdn.com",
  "style-src 'self' 'unsafe-inline' https://js.arcgis.com",
  "img-src 'self' data: blob: https://*.arcgis.com https://*.arcgisonline.com https://res.cloudinary.com",
  "connect-src 'self' https://*.arcgis.com https://*.arcgisonline.com https://*.sentry.io https://*.ingest.sentry.io https://*.supabase.co https://api.cloudinary.com",
  "worker-src 'self' blob:",
];

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `${cspDirectives.join('; ')};`,
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'geolocation=(), microphone=(), camera=()',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled to prevent ResizeObserver issues during SSR
  swcMinify: true,
  generateEtags: false,
  productionBrowserSourceMaps: false,
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60, // 1 hour
    pagesBufferLength: 5,
  },
  transpilePackages: ["@arcgis/core"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

const sentryWebpackPluginOptions = {
  hideSourceMaps: true,
  deleteAfterCompile: true,
  silent: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions)
