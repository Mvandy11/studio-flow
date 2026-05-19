/**
 * Typed Supabase client for Studio Flow.
 * Re-exports the shared singleton from supabase.js so there is exactly
 * one client instance throughout the app (avoids duplicate auth state).
 */
export { supabase as supabaseClient } from './supabase';
