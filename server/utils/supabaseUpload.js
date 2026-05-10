import { v4 as uuidv4 } from 'uuid';
import supabase from '../supabase.js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'studio-flow-library';

/**
 * Upload any buffer to Supabase Storage.
 *
 * @param {Buffer}  buffer       - File bytes
 * @param {string}  folder       - Storage path without leading slash
 * @param {string}  filename     - Desired filename
 * @param {string}  contentType  - MIME type
 * @returns {Promise<{ publicUrl: string, path: string, id: string }>}
 */
export async function uploadBuffer(
  buffer,
  folder,
  filename,
  contentType = 'application/octet-stream'
) {
  const id = uuidv4();
  const storagePath = `${folder}/${id}_${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: false });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  return { publicUrl: data.publicUrl, path: storagePath, id };
}

/**
 * List files in a storage folder.
 */
export async function listFolder(folder, opts = {}) {
  const { limit = 100, offset = 0 } = opts;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { limit, offset, sortBy: { column: 'created_at', order: 'desc' } });

  if (error) throw new Error(`Supabase list failed: ${error.message}`);
  return (data || []).filter((f) => f.name && !f.name.endsWith('/'));
}

export { supabase, BUCKET };
