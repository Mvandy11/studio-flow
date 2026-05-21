import { supabase } from './supabaseClient';

export async function uploadSessionThumbnail(file, sessionId) {
  const fileExt = file.name.split('.').pop();
  const filePath = `thumbnails/${sessionId}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('session-thumbnails')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage
    .from('session-thumbnails')
    .getPublicUrl(filePath);

  return publicUrl.publicUrl;
}
