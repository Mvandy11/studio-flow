import { supabase } from '../../lib/supabaseClient';
import type { ProfileSubscription } from '../../lib/types';

/**
 * Fetch subscription state for a given user from the profiles table.
 * Returns null when no profile row exists.
 */
export async function getMembership(userId: string): Promise<ProfileSubscription | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_active, subscription_status, current_period_end')
    .eq('id', userId)
    .single();

  if (error) return null;
  return (data as ProfileSubscription) ?? null;
}
