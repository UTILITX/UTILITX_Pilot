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
  reactStrictMode: false, // Disabled to prevent ResizeObserver issues during SSR
  
  swcMinify: true,
  
  // CRITICAL: NO output mode - allows SSR through Firebase Functions
  // Do NOT use "standalone" or "export" - both break SSR
  // Firebase Functions handles the server, we just need standard Next.js SSR
  
  // Disable static generation entirely
  generateEtags: false,
  
  // Ensure dynamic rendering
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60, // 1 hour
    pagesBufferLength: 5,
  },
  
  // Transpile ArcGIS packages (required for SSR)
  transpilePackages: ["@arcgis/core"],
  
  // TypeScript - ignore build errors for faster builds
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Images - unoptimized for Firebase Functions
  images: {
    unoptimized: true,
  },
}

export default nextConfig
