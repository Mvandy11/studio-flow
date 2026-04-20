import { supabase } from './supabase';
import { createProfile } from './profile';

// Sign up with email + password
export async function signup(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// Log in with email + password
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// Log out
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get the current user (session-based)
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// Listen for auth state changes
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// Automatically create a profile after signup
export async function signupAndCreateProfile(email, password, username) {
  const { user } = await signup(email, password);

  await createProfile({
    id: user.id,
    username,
    display_name: username,
    bio: '',
    avatar_url: '',
  });

  return user;
}
