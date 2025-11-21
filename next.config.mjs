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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // UTILITX runs in SSR mode on Firebase Functions.
  // DO NOT use output: 'export' - it breaks next start and dynamic routes.
  // This configuration is required for Blaze plan networking (Supabase, Esri, GPT, Flask).
  
  transpilePackages: ["@arcgis/core"],
  
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
