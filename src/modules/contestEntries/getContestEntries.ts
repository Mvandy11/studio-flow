import { supabase } from '../../lib/supabase';
import type { ContestEntry } from '../../lib/types';

/**
 * Fetch all entries for a contest, sorted by vote_count descending.
 * Public read — no auth required.
 */
export async function getContestEntries(contestId: string): Promise<ContestEntry[]> {
  const { data, error } = await supabase
    .from('contest_entries')
    .select('*')
    .eq('contest_id', contestId)
    .order('vote_count', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ContestEntry[];
}
