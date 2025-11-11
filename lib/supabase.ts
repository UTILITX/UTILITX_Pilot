/**
 * Supabase Client Module
 * 
 * This module provides Supabase client access for file storage operations.
 * It uses a factory function to ensure environment variables are resolved
 * correctly in all environments (client, server, Firebase Functions).
 * 
 * IMPORTANT: The client is created at runtime, not at module load time,
 * ensuring it works correctly in SSR and Firebase Functions deployments.
 */

"use client"

import { getSupabaseClient, isSupabaseConfigured } from './supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization: Create client only when needed, not at module load
// This ensures environment variables are resolved at runtime, not build time
let supabaseInstance: SupabaseClient | null = null

/**
 * Get the Supabase client instance.
 * Creates the client on first access, ensuring it works in all environments.
 * 
 * @returns Supabase client instance, or null if not configured
 */
function getSupabase(): SupabaseClient | null {
  // Check if Supabase is configured before attempting to create client
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      console.warn('⚠️ Supabase environment variables not set. File upload features will not work.')
      console.warn('   💡 Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are in .env.local')
      console.warn('   💡 Variables MUST have NEXT_PUBLIC_ prefix to be available client-side in Next.js')
      console.warn('   💡 Restart the dev server after updating .env.local')
    }
    return null
  }
  
  // Create client on first access (lazy initialization)
  if (!supabaseInstance) {
    try {
      supabaseInstance = getSupabaseClient()
      if (typeof window !== "undefined") {
        console.log('✅ Supabase client initialized successfully')
      }
    } catch (error) {
      console.error('❌ Error initializing Supabase client:', error)
      return null
    }
  }
  
  return supabaseInstance
}

// Export the factory function for direct use
// Recommended: Use getSupabaseClient() directly in new code
export { getSupabaseClient, isSupabaseConfigured }

// Legacy export: Create a getter function for backward compatibility
// This ensures the client is created at runtime when accessed
let _supabaseCache: SupabaseClient | null = null

/**
 * Get Supabase client instance (legacy compatibility)
 * Creates the client on first access, ensuring it works in all environments.
 * 
 * @deprecated Use getSupabaseClient() directly for better control
 */
function getSupabaseInstance(): SupabaseClient | null {
  if (!_supabaseCache) {
    if (!isSupabaseConfigured()) {
      return null
    }
    try {
      _supabaseCache = getSupabaseClient()
    } catch (error) {
      console.error('❌ Error initializing Supabase client:', error)
      return null
    }
  }
  return _supabaseCache
}

// Export supabase as a getter that creates client at runtime
// This maintains backward compatibility with existing code
// Note: Accessing properties will create the client on first access
export const supabase: SupabaseClient | null = (() => {
  // Return a proxy that lazily creates the client
  return new Proxy({} as any, {
    get(target, prop) {
      const client = getSupabaseInstance()
      if (!client) {
        // Return undefined for properties if client not available
        return undefined
      }
      return (client as any)[prop]
    }
  })
})()

// Bucket name is hardcoded to match Supabase bucket name exactly (case-sensitive)
const BUCKET_NAME = 'Records_Private'

// Debug: Log bucket name on client-side
if (typeof window !== "undefined") {
  console.log('🔍 Supabase Storage Bucket:', BUCKET_NAME)
}

/**
 * Upload a file to Supabase Storage bucket
 * Bucket name is hardcoded to "Records_Private" (case-sensitive)
 * @param file - The file to upload
 * @param path - Optional custom path (defaults to timestamped filename)
 * @returns The signed URL (for private buckets) or public URL of the uploaded file
 */
export async function uploadFileToSupabase(
  file: File,
  path?: string
): Promise<{ url: string; path: string }> {
  const startTime = Date.now();
  
  // Use factory function to get client at runtime
  const supabase = getSupabaseClient()
  
  // Generate a unique path if not provided
  const filePath = path || `${Date.now()}-${file.name}`
  
  // Import logger (uses dynamic require for firebase-functions, safe for client-side)
  const { logger } = await import('./logger');
  logger.supabase('upload_start', { file: file.name, path: filePath, size: file.size });
  
  try {
    // Upload file to bucket (from environment variable)
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      logger.error('supabase', 'upload', error as Error, { 
        file: file.name, 
        path: filePath, 
        bucket: BUCKET_NAME 
      });
      throw new Error(`Failed to upload file: ${error.message}`)
    }
    
    const duration = Date.now() - startTime;
    logger.performance('supabase', 'upload', duration, { 
      file: file.name, 
      path: data.path,
      bucket: BUCKET_NAME 
    });

    // For private buckets, use signed URL instead of public URL
    // Signed URLs are valid for 1 hour by default
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(data.path, 3600) // Valid for 1 hour

    if (signedUrlError) {
      logger.error('supabase', 'signed_url', signedUrlError as Error, { 
        path: data.path,
        bucket: BUCKET_NAME 
      });
      // Fallback to public URL if signed URL fails
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path)
      return {
        url: urlData.publicUrl,
        path: data.path
      }
    }

    return {
      url: signedUrlData.signedUrl,
      path: data.path
    }
  } catch (error) {
    logger.error('supabase', 'upload', error as Error, { 
      file: file.name, 
      path: filePath 
    });
    throw error;
  }
}

/**
 * Upload multiple files to Supabase Storage
 * @param files - Array of files to upload
 * @returns Array of upload results with URLs
 */
export async function uploadFilesToSupabase(
  files: File[]
): Promise<Array<{ file: File; url: string; path: string }>> {
  const uploadPromises = files.map(async (file) => {
    const result = await uploadFileToSupabase(file)
    return {
      file,
      url: result.url,
      path: result.path
    }
  })

  return Promise.all(uploadPromises)
}

/**
 * Get a signed URL for a file in Supabase Storage
 * Use this when displaying files, as signed URLs expire after 1 hour
 * @param path - The file path in the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const startTime = Date.now();
  
  // Use factory function to get client at runtime
  const supabase = getSupabaseClient()
  
  // Import logger dynamically
  const { logger } = await import('./logger');
  logger.supabase('signed_url_start', { path, expiresIn });
  
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresIn)

    if (error) {
      logger.error('supabase', 'signed_url', error as Error, { 
        path, 
        bucket: BUCKET_NAME 
      });
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    const duration = Date.now() - startTime;
    logger.performance('supabase', 'signed_url', duration, { path });
    
    return data.signedUrl
  } catch (error) {
    logger.error('supabase', 'signed_url', error as Error, { path });
    throw error;
  }
}

