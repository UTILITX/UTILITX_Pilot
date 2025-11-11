/**
 * Supabase Client Factory
 * 
 * This module provides a factory function to create Supabase clients that work in:
 * - Client-side (browser): Reads from NEXT_PUBLIC_* env vars
 * - Server-side (Next.js SSR): Reads from NEXT_PUBLIC_* env vars
 * - Firebase Functions: Reads from NEXT_PUBLIC_* env vars (set via Firebase environment variables)
 * 
 * IMPORTANT: 
 * - This creates the client at runtime, not at module load time
 * - Uses only environment variables (no firebase-functions dependency)
 * - Works in all environments without build warnings
 * 
 * Firebase Functions Configuration:
 * Set environment variables in Firebase Functions using:
 *   firebase functions:config:set supabase.url="..." supabase.anon_key="..."
 * Or use Firebase Console → Functions → Configuration → Environment variables
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Get Supabase configuration from environment variables.
 * Works in all environments (client, server, Firebase Functions).
 * 
 * Priority order:
 * 1. NEXT_PUBLIC_* env vars (available everywhere after build)
 * 2. Non-prefixed env vars (server-side only, Firebase Functions)
 */
function getSupabaseConfig(): { url: string; anonKey: string } {
  // Primary: NEXT_PUBLIC_* env vars (available in all environments)
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  // Server-side fallback: Non-prefixed env vars (Firebase Functions, server-only)
  if (typeof window === 'undefined') {
    if (!url) url = process.env.SUPABASE_URL || ''
    if (!anonKey) anonKey = process.env.SUPABASE_ANON_KEY || ''
  }
  
  return { url, anonKey }
}

/**
 * Get or create a Supabase client instance.
 * Creates the client at runtime, ensuring environment variables are resolved correctly.
 * 
 * @returns Supabase client instance
 * @throws Error if Supabase configuration is missing
 */
export function getSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig()
  
  if (!url || !anonKey) {
    const errorMsg = 
      'Supabase configuration is missing.\n\n' +
      'Required environment variables:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n' +
      (typeof window === 'undefined' 
        ? 'Server-side: These can also be set as:\n' +
          '  - SUPABASE_URL and SUPABASE_ANON_KEY (server-side only)\n' +
          '  - Or via Firebase Functions environment variables\n\n'
        : 'Client-side: These must be prefixed with NEXT_PUBLIC_ and available at build time.\n\n'
      ) +
      'Setup:\n' +
      '1. Local development: Set in .env.local\n' +
      '2. Firebase Functions: Set via Firebase Console or CLI:\n' +
      '   firebase functions:config:set supabase.url="..." supabase.anon_key="..."\n' +
      '3. Restart your server after updating environment variables'
    
    console.error('❌', errorMsg)
    throw new Error(errorMsg)
  }
  
  // Create client at runtime (not module load time)
  const client = createClient(url, anonKey)
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const env = typeof window === 'undefined' ? 'server' : 'client'
    console.log(`✅ Supabase client initialized on ${env}`)
    console.log(`   URL: ${url.substring(0, 30)}...`)
    console.log(`   Key: ${anonKey.substring(0, 20)}...`)
  }
  
  return client
}

/**
 * Check if Supabase is configured.
 * Useful for conditional rendering or feature flags.
 * 
 * @returns true if Supabase configuration is available
 */
export function isSupabaseConfigured(): boolean {
  try {
    const { url, anonKey } = getSupabaseConfig()
    return !!(url && anonKey)
  } catch {
    return false
  }
}

