import { supabase } from '../lib/supabaseClient';

/**
 * Fetch AI output records from the ai_outputs table, optionally filtered by tool.
 */
export async function fetchAiOutputs({
  tool   = null,
  limit  = 50,
  offset = 0,
  sortBy = 'created_at',
  asc    = false,
} = {}) {
  let query = supabase
    .from('ai_outputs')
    .select('*', { count: 'exact' })
    .order(sortBy, { ascending: asc })
    .range(offset, offset + limit - 1);

  if (tool) query = query.eq('tool', tool);

  const { data, count, error } = await query;

  if (error) throw new Error(error.message || 'Failed to load AI outputs.');

  return { data: data || [], count: count || 0 };
}

/**
 * Delete a single AI output record and its storage file.
 */
export async function deleteAiOutput(id, storagePath) {
  const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'studio-flow-library';

  const { error: storageErr } = await supabase.storage
    .from(bucket)
    .remove([storagePath]);

  if (storageErr) {
    console.warn('[libraryApi] Storage delete warning:', storageErr.message);
  }

  const { error: dbErr } = await supabase.from('ai_outputs').delete().eq('id', id);

  if (dbErr) throw new Error(dbErr.message || 'Failed to delete record.');
}
