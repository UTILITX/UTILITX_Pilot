"use client"

import { createClient } from '@supabase/supabase-js'
import { env } from './env'

// Debug: Log environment variables on client-side
if (typeof window !== "undefined") {
  console.log('🔍 Supabase Environment Check:')
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')
  console.log('   env.SUPABASE_URL:', env.SUPABASE_URL ? '✅ Set' : '❌ Missing')
  console.log('   env.SUPABASE_ANON_KEY:', env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')
}

const supabaseUrl = env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Don't throw error at module load - let functions handle it
// This prevents blank screen if env vars are missing
let supabase: ReturnType<typeof createClient> | null = null

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    if (typeof window !== "undefined") {
      console.log('✅ Supabase client initialized successfully')
    }
  } catch (error) {
    console.error('❌ Error initializing Supabase client:', error)
  }
} else {
  // Debug: Log what we're getting
  if (typeof window !== "undefined") {
    console.warn('⚠️ Supabase environment variables not set. File upload features will not work.')
    console.warn('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
    console.warn('   SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
    console.warn('   💡 Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are in .env.local')
    console.warn('   💡 Variables MUST have NEXT_PUBLIC_ prefix to be available client-side in Next.js')
    console.warn('   💡 Restart the dev server after updating .env.local')
  }
}

export { supabase }

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
  if (!supabase) {
    throw new Error('Supabase client not initialized. Please check your environment variables.')
  }
  
  // Generate a unique path if not provided
  const filePath = path || `${Date.now()}-${file.name}`
  
  // Upload file to bucket (from environment variable)
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Error uploading file to Supabase:', error)
    console.error(`Bucket name: ${BUCKET_NAME}`)
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  // For private buckets, use signed URL instead of public URL
  // Signed URLs are valid for 1 hour by default
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(data.path, 3600) // Valid for 1 hour

  if (signedUrlError) {
    console.error('Error creating signed URL:', signedUrlError)
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
  if (!supabase) {
    const errorMsg = 'Supabase client not initialized. Please check your environment variables.\n\n' +
      'Make sure you have:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL in .env.local\n' +
      '- NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local\n\n' +
      'Note: Variables MUST have the NEXT_PUBLIC_ prefix to be available client-side in Next.js.\n' +
      'Restart your dev server after updating .env.local.'
    throw new Error(errorMsg)
  }
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn)

  if (error) {
    console.error('Error creating signed URL:', error)
    console.error(`Bucket name: ${BUCKET_NAME}`)
    throw new Error(`Failed to create signed URL: ${error.message}`)
  }

  return data.signedUrl
}

