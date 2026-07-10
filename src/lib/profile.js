import { supabase } from './supabase';

// Create a profile (called after signup)
export async function createProfile({ id, username, display_name, bio, avatar_url }) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id, username, display_name, bio, avatar_url })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get a profile by user ID — returns null if not found, never throws
export async function getProfileById(id) {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[profile] getProfileById error:', error.message);
      return null;
    }
    return data || null;
  } catch (err) {
    console.error('[profile] getProfileById unexpected error:', err);
    return null;
  }
}

// Update a profile — throws on error (caller must handle)
export async function updateProfile(id, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Search profiles by username (for discovery)
export async function searchProfiles(query) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${query}%`);

  if (error) throw error;
  return data;
}
