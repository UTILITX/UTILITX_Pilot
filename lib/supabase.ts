import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Upload a file to Supabase Storage bucket "Records_Private"
 * @param file - The file to upload
 * @param path - Optional custom path (defaults to timestamped filename)
 * @returns The public URL of the uploaded file
 */
export async function uploadFileToSupabase(
  file: File,
  path?: string
): Promise<{ url: string; path: string }> {
  // Generate a unique path if not provided
  const filePath = path || `${Date.now()}-${file.name}`
  
  // Upload file to Records_Private bucket
  const { data, error } = await supabase.storage
    .from('Records_Private')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Error uploading file to Supabase:', error)
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('Records_Private')
    .getPublicUrl(data.path)

  return {
    url: urlData.publicUrl,
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

