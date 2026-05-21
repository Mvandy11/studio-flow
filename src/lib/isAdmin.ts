import { supabase } from './supabaseClient';

/**
 * Fetch the user's profile role and return true if they are an admin.
 * Uses the anon client — profiles RLS allows public SELECT.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return data?.role === 'admin' || data?.role === 'creator_admin';
}

/**
 * Synchronous check on a role string already in memory.
 * Use this when you already have the role from useAuth().
 */
export function isAdminRole(role?: string | null): boolean {
  return role === 'admin' || role === 'creator_admin';
}
