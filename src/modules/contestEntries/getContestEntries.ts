import { supabase } from '../../lib/supabaseClient';
import type { ContestEntry } from '../../lib/types';

/**
 * Fetch all active entries for a contest from the submissions table,
 * sorted by created_at descending (like_count is aggregated server-side
 * by GET /api/contests/:id).
 * Public read — no auth required.
 */
export async function getContestEntries(contestId: string): Promise<ContestEntry[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('contest_id', contestId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ContestEntry[];
}
