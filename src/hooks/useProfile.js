/**
 * useProfile — loads the current user's profile from the backend API.
 *
 * - Uses supabase.auth.getSession() to get the JWT (no extra getUser() call)
 * - Calls GET /api/auth/profile (service-role key → bypasses RLS)
 * - If no session, returns { profile: null, loading: false, error: null }
 * - Never crashes on undefined user or missing fields
 * - Cancelled flag prevents stale state on fast unmount
 */
import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';
import { updateProfile } from '../lib/profile';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async (signal) => {
    // No authenticated user — reset immediately
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Retrieve the current session JWT without an extra network call
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;

      if (!jwt) {
        // Session disappeared between auth event and here — treat as signed-out
        if (!signal.cancelled) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const res = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (signal.cancelled) return;

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Profile request failed (${res.status})`);
      }

      const data = await res.json();
      if (!signal.cancelled) setProfile(data ?? null);
    } catch (err) {
      if (!signal.cancelled) setError(err?.message || 'Failed to load profile');
    } finally {
      if (!signal.cancelled) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const signal = { cancelled: false };
    load(signal);
    return () => { signal.cancelled = true; };
  }, [load]);

  async function saveProfile(updates) {
    if (!user?.id) return null;
    try {
      const updated = await updateProfile(user.id, updates);
      setProfile(updated);
      return updated;
    } catch (err) {
      setError(err?.message || 'Failed to save profile');
      return null;
    }
  }

  return { profile, loading, error, saveProfile };
}
