import { supabase } from '../../lib/supabaseClient';
import type { ProfileSubscription } from '../../lib/types';

/**
 * Fetch subscription state for a given user from the backend API.
 * Uses GET /api/auth/membership (service-role key — bypasses RLS).
 * Returns null when unauthenticated or on error.
 */
export async function getMembership(userId: string): Promise<ProfileSubscription | null> {
  if (!userId) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt) return null;

    // ── FIX: prefix with VITE_API_BASE_URL so the request reaches
    //         the Render backend, not the Netlify CDN ──────────────
    const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
    const res = await fetch(`${BASE}/api/auth/membership`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!res.ok) return null;
    return (await res.json()) as ProfileSubscription;
  } catch {
    return null;
  }
}
