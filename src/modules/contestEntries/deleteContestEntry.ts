import { supabase } from '../../lib/supabase';
import { isAdmin } from '../../lib/isAdmin';

/**
 * Delete a contest entry. Admin-only — throws if the caller is not an admin.
 */
export async function deleteContestEntry(
  entryId: string,
  callerId: string,
): Promise<void> {
  const adminCheck = await isAdmin(callerId);
  if (!adminCheck) throw new Error('Admin access required to delete entries.');

  const { error } = await supabase
    .from('contest_entries')
    .delete()
    .eq('id', entryId);

  if (error) throw new Error(error.message);
}
