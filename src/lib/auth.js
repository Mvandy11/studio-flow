import { supabase } from './supabaseClient';
import { createProfile } from './profile';

// Sign up with email + password
export async function signup(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

// Log in with email + password
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Log out
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get the current user from the local session (no network call — fast and safe)
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

// Listen for auth state changes
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// Automatically create a profile after signup
export async function signupAndCreateProfile(email, password, username) {
  const data = await signup(email, password);
  const user = data?.user;

  if (user?.id) {
    await createProfile({
      id: user.id,
      username,
      display_name: username,
      bio: '',
      avatar_url: '',
    });
  }

  return user;
}
