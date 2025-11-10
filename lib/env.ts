/**
 * Environment variable validation and access
 * This ensures environment variables are available at runtime
 */

function getEnvVar(key: string, defaultValue?: string): string {
  if (typeof window === "undefined") {
    // Server-side: use process.env directly
    return process.env[key] || defaultValue || "";
  }
  
  // Client-side: Next.js injects NEXT_PUBLIC_ vars at build time
  // Access via window.__ENV__ or process.env (both work in Next.js)
  // Note: Variables without NEXT_PUBLIC_ prefix are NOT available client-side in Next.js
  // This function will return empty string for non-prefixed vars on client-side
  const value = process.env[key] || (window as any).__ENV__?.[key] || defaultValue || "";
  
  // Only warn if no value and no default, and only for NEXT_PUBLIC_ prefixed vars
  // (non-prefixed vars are expected to be empty on client-side)
  if (!value && !defaultValue && key.startsWith("NEXT_PUBLIC_")) {
    console.warn(`⚠️ Environment variable ${key} is not set`);
    console.warn(`💡 Make sure ${key} is in .env.local with the NEXT_PUBLIC_ prefix`);
    console.warn(`💡 Restart the dev server after updating .env.local`);
    
    // Debug: Check if the key exists in process.env but is undefined
    if (key in process.env && process.env[key] === undefined) {
      console.warn(`⚠️ ${key} exists in process.env but is undefined - check .env.local format`);
    }
  }
  
  return value;
}

export const env = {
  // Support both NEXT_PUBLIC_ prefixed and non-prefixed versions for flexibility
  ARCGIS_API_KEY: getEnvVar("NEXT_PUBLIC_ARCGIS_API_KEY") || getEnvVar("ARCGIS_API_KEY"),
  WORKAREA_LAYER_URL: getEnvVar("NEXT_PUBLIC_WORKAREA_LAYER_URL") || getEnvVar("WORKAREA_LAYER_URL"),
  RECORDS_LAYER_URL: getEnvVar("NEXT_PUBLIC_RECORDS_LAYER_URL") || getEnvVar("RECORDS_LAYER_URL"),
  SUPABASE_URL: getEnvVar("NEXT_PUBLIC_SUPABASE_URL") || getEnvVar("SUPABASE_URL"),
  SUPABASE_ANON_KEY: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY") || getEnvVar("SUPABASE_ANON_KEY"),
  SUPABASE_BUCKET: getEnvVar("NEXT_PUBLIC_SUPABASE_BUCKET") || getEnvVar("SUPABASE_STORAGE_BUCKET", "Records_Private"), // Support both variable names, default to Records_Private
};

// Validate required environment variables
export function validateEnv() {
  const missing: string[] = [];
  
  if (!env.ARCGIS_API_KEY) missing.push("NEXT_PUBLIC_ARCGIS_API_KEY");
  if (!env.WORKAREA_LAYER_URL) missing.push("NEXT_PUBLIC_WORKAREA_LAYER_URL");
  if (!env.RECORDS_LAYER_URL) missing.push("NEXT_PUBLIC_RECORDS_LAYER_URL");
  
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:", missing);
    if (typeof window !== "undefined") {
      console.error("💡 Make sure these are set in your deployment environment (Vercel, Netlify, etc.)");
    }
    return false;
  }
  
  return true;
}

