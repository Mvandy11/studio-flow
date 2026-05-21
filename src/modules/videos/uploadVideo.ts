import { supabase } from '../../lib/supabaseClient';

const MIME_MAP: Record<string, string> = {
  mp4:  'video/mp4',
  mov:  'video/quicktime',
  avi:  'video/x-msvideo',
  webm: 'video/webm',
  mkv:  'video/x-matroska',
  m4v:  'video/mp4',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  gif:  'image/gif',
  webp: 'image/webp',
  mp3:  'audio/mpeg',
  wav:  'audio/wav',
  ogg:  'audio/ogg',
};

export interface UploadVideoResult {
  publicUrl: string;
  storagePath: string;
}

/**
 * Upload a file to a Supabase storage bucket and return its public URL.
 *
 * @param file   - The File object to upload
 * @param folder - Storage path prefix (default: 'uploads')
 * @param bucket - Supabase bucket name (default: 'videos')
 */
export async function uploadVideo(
  file: File,
  folder = 'uploads',
  bucket = 'videos',
): Promise<UploadVideoResult> {
  const ext         = (file.name.split('.').pop() ?? 'bin').toLowerCase();
  const filename    = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${folder}/${filename}`;
  const contentType = MIME_MAP[ext] || file.type || 'application/octet-stream';

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, { contentType, upsert: false });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) throw new Error('Could not retrieve public URL after upload.');

  return { publicUrl, storagePath };
}
