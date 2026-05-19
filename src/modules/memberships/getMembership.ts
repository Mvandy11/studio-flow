import { supabase } from '../../lib/supabase';
import type { Membership } from '../../lib/types';

/**
 * Fetch the memberships row for a given user.
 * Returns null when no row exists (free / never subscribed).
 */
export async function getMembership(userId: string): Promise<Membership | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Membership) ?? null;
}
