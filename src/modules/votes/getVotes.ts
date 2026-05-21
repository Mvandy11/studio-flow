import { supabase } from '../../lib/supabaseClient';
import type { ContestVote } from '../../lib/types';

/**
 * Fetch all votes for a specific contest entry.
 * Public read — no auth required.
 */
export async function getVotes(entryId: string): Promise<ContestVote[]> {
  const { data, error } = await supabase
    .from('contest_votes')
    .select('*')
    .eq('entry_id', entryId);

  if (error) throw new Error(error.message);
  return (data ?? []) as ContestVote[];
}

/**
 * Check whether a specific user has already voted on a specific entry.
 */
export async function hasUserVoted(entryId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('contest_votes')
    .select('id')
    .eq('entry_id', entryId)
    .eq('user_id', userId)
    .maybeSingle();
  return data !== null;
}
