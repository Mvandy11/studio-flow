import { supabase } from '../../lib/supabaseClient';
import type { ContestEntry } from '../../lib/types';

export interface CreateContestEntryInput {
  contestId: string;
  userId: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  submitterEmail?: string | null;
  submitterName?: string | null;
}

/**
 * Insert a new row into submissions for a contest entry.
 * Requires the user to be authenticated (enforced by RLS).
 */
export async function createContestEntry(
  input: CreateContestEntryInput,
): Promise<ContestEntry> {
  const { contestId, userId, title, description, videoUrl, submitterEmail, submitterName } = input;

  const { data, error } = await supabase
    .from('submissions')
    .insert({
      contest_id:  contestId,
      user_id:     userId,
      user_name:   submitterName ?? null,
      user_email:  submitterEmail ?? null,
      title,
      description: description ?? null,
      media_url:   videoUrl ?? null,
      video_url:   videoUrl ?? null,
      status:      'active',
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
