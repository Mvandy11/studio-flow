import { supabase } from '../../../lib/supabase';

const BUCKET = 'library';
const DENOISE_PREFIX = 'ai-outputs/denoise/';

export async function fetchDenoiseOutputs(userId, opts = {}) {
  const { limit = 50, offset = 0, sortBy = 'created_at' } = opts;
  const prefix = `${DENOISE_PREFIX}${userId}/`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit, offset, sortBy: { column: sortBy, order: 'desc' } });

  if (error) throw new Error(`Failed to load AI outputs: ${error.message}`);
  if (!data || data.length === 0) return [];

  return data
    .filter((f) => f.name && !f.name.endsWith('/'))
    .map((f) => {
      const fullPath = `${prefix}${f.name}`;
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fullPath);
      return {
        id: f.id ?? f.name,
        name: f.name.replace(/^\d+_/, ''),
        fullPath,
        publicUrl: urlData?.publicUrl ?? '',
        toolName: 'Denoise',
        createdAt: f.created_at ?? f.updated_at ?? '',
        size: f.metadata?.size ?? 0,
      };
    });
}

export async function deleteDenoiseOutput(fullPath) {
  const { error } = await supabase.storage.from(BUCKET).remove([fullPath]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
