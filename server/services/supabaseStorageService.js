import { supabase } from '../supabase/client.js';

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'studio-flow-library';

/**
 * Uploads a Buffer to Supabase Storage.
 *
 * @param {Buffer}  buffer         - File content to upload
 * @param {string}  filename       - Filename for the stored object
 * @param {string}  folderPath     - Folder inside the bucket (no leading slash)
 * @param {string}  [contentType]  - MIME type (defaults to audio/wav)
 * @returns {Promise<{ publicUrl: string, path: string }>}
 */
export async function uploadToSupabase(
  buffer,
  filename,
  folderPath = 'library/ai-outputs/denoise',
  contentType = 'audio/wav'
) {
  const storagePath = `${folderPath}/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, { contentType, upsert: false });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return { publicUrl: urlData.publicUrl, path: storagePath };
}
