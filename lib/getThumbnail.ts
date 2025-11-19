/**
 * Get Cloudinary thumbnail URL for a record
 * @param publicId - Cloudinary public_id (stored in record metadata)
 * @param w - Width in pixels (default: 300)
 * @param h - Height in pixels (default: 300)
 * @returns Cloudinary transformation URL
 */
export function getThumbnail(publicId: string, w = 300, h = 300) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloud) {
    console.warn("⚠️ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set");
    return null;
  }
  // Remove any file extension from publicId (Cloudinary handles format via transformations)
  const cleanId = publicId.replace(/\.(jpg|jpeg|png|gif|pdf|webp)$/i, '');
  // c_fill: fill mode, g_auto: auto gravity, f_auto: auto format
  return `https://res.cloudinary.com/${cloud}/image/upload/c_fill,g_auto,f_auto,w_${w},h_${h}/${cleanId}`;
}

/**
 * Get blur placeholder thumbnail (for progressive loading)
 * @param publicId - Cloudinary public_id
 * @returns Blur placeholder URL
 */
export function getBlurThumb(publicId: string) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloud) {
    console.warn("⚠️ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set");
    return null;
  }
  // Remove any file extension from publicId
  const cleanId = publicId.replace(/\.(jpg|jpeg|png|gif|pdf|webp)$/i, '');
  // e_blur: blur effect, q_1: low quality, w_10: tiny width
  return `https://res.cloudinary.com/${cloud}/image/upload/e_blur:300,q_1,w_10,g_auto/${cleanId}`;
}

/**
 * Get optimized image URL for preview (larger than thumbnail)
 * @param publicId - Cloudinary public_id
 * @param w - Width in pixels (default: 800)
 * @param h - Height in pixels (default: 600)
 * @returns Optimized preview URL
 */
export function getPreviewImage(publicId: string, w = 800, h = 600) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloud) {
    console.warn("⚠️ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set");
    return null;
  }
  // Remove any file extension from publicId
  const cleanId = publicId.replace(/\.(jpg|jpeg|png|gif|pdf|webp)$/i, '');
  // c_limit: limit mode (maintains aspect ratio), q_auto: auto quality
  return `https://res.cloudinary.com/${cloud}/image/upload/c_limit,q_auto,f_auto,w_${w},h_${h}/${cleanId}`;
}

/**
 * Get PDF first page as image thumbnail
 * @param publicId - Cloudinary public_id for PDF
 * @param w - Width in pixels (default: 300)
 * @param h - Height in pixels (default: 300)
 * @returns PDF first page thumbnail URL
 */
export function getPdfThumbnail(publicId: string, w = 300, h = 300) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloud) {
    console.warn("⚠️ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set");
    return null;
  }
  // Remove any file extension from publicId (Cloudinary knows it's a PDF from the upload)
  const cleanId = publicId.replace(/\.(pdf|jpg|jpeg|png|gif|webp)$/i, '');
  // pg_1: first page, fl_png: convert to PNG
  return `https://res.cloudinary.com/${cloud}/image/upload/c_fill,g_auto,f_png,w_${w},h_${h}/pg_1/${cleanId}`;
}

