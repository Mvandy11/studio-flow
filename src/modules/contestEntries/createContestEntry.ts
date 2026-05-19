import { supabase } from '../../lib/supabase';
import type { ContestEntry } from '../../lib/types';

export interface CreateContestEntryInput {
  contestId: string;
  userId: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  submitterEmail?: string | null;
}

/**
 * Insert a new row into contest_entries.
 * Requires the user to be authenticated (enforced by RLS).
 */
export async function createContestEntry(
  input: CreateContestEntryInput,
): Promise<ContestEntry> {
  const { contestId, userId, title, description, videoUrl, submitterEmail } = input;

  const { data, error } = await supabase
    .from('contest_entries')
    .insert({
      contest_id:      contestId,
      user_id:         userId,
      title,
      description:     description ?? null,
      file_url:        videoUrl ?? null,
      submitter_email: submitterEmail ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505' || error.message?.includes('unique')) {
      throw new Error('You have already submitted an entry to this contest.');
    }
    throw new Error(error.message);
  }

  return data as ContestEntry;
}
