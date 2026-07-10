import { supabase } from '../../lib/supabase';

/**
 * Cast a vote for a contest entry.
 * The unique(entry_id, user_id) constraint prevents duplicate votes.
 * After inserting the vote, the vote_count on contest_entries is synced.
 */
export async function voteOnEntry(
  entryId: string,
  contestId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('contest_votes')
    .insert({ entry_id: entryId, contest_id: contestId, user_id: userId });

  if (error) {
    if (error.code === '23505' || error.message?.includes('unique')) {
      throw new Error('You have already voted on this entry.');
    }
    throw new Error(error.message);
  }

  // Sync vote_count from the authoritative contest_votes table
  const { count } = await supabase
    .from('contest_votes')
    .select('id', { count: 'exact', head: true })
    .eq('entry_id', entryId);

  await supabase
    .from('contest_entries')
    .update({ vote_count: count ?? 0 })
    .eq('id', entryId);
}
