import { supabase } from './supabaseClient';

export async function uploadSelfie(file, memberId) {
  const ext = file.name.split('.').pop();
  const path = `${memberId}/selfie-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('selfies').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('selfies').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadVoice(file, memberId) {
  const ext = file.name.split('.').pop();
  const path = `${memberId}/voice-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('voices').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('voices').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadSessionThumbnail(file, sessionId) {
  const ext = file.name.split('.').pop();
  const path = `thumbnails/${sessionId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('selfies').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('selfies').getPublicUrl(path);
  return data.publicUrl;
}
