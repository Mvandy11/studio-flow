import { createClient } from '@supabase/supabase-js';

// ── Supabase client with service role key ────────────────────
// Server-side uploads require the service role key (not anon key).
// Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.
const supabaseUrl  = process.env.SUPABASE_URL  || process.env.VITE_SUPABASE_URL;
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const BUCKET_NAME  = process.env.SUPABASE_STORAGE_BUCKET || 'studio-flow-library';

if (!supabaseUrl) {
  console.warn('[supabase] SUPABASE_URL is not set — storage uploads will fail.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return {
    publicUrl: urlData.publicUrl,
    path: storagePath,
  };
}
