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
  const value = process.env[key] || (window as any).__ENV__?.[key] || defaultValue || "";
  
  if (!value && !defaultValue) {
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
  ARCGIS_API_KEY: getEnvVar("NEXT_PUBLIC_ARCGIS_API_KEY"),
  WORKAREA_LAYER_URL: getEnvVar("NEXT_PUBLIC_WORKAREA_LAYER_URL"),
  RECORDS_LAYER_URL: getEnvVar("NEXT_PUBLIC_RECORDS_LAYER_URL"),
  SUPABASE_URL: getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
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

