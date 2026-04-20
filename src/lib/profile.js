import { supabase } from './supabase';

// Create a profile (called after signup)
export async function createProfile({ id, username, display_name, bio, avatar_url }) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id,
      username,
      display_name,
      bio,
      avatar_url,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get a profile by user ID
export async function getProfileById(id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Update a profile
export async function updateProfile(id, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

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
