import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ROLES } from '../lib/roles';

const AuthContext = createContext(null);

// ── Known admin email (permanent, per replit.md) ─────────────────────────────
const ADMIN_EMAIL = 'obviouslyinspiredstudio@outlook.com';

// ── Server-side profile fetch (uses service role → bypasses RLS) ─────────────
// Calls GET /api/auth/profile with the user's JWT. The server reads the
// profiles table with the service-role key so Supabase RLS can never block it.
async function fetchProfileFromServer(jwt) {
  try {
    const res = await fetch('/api/auth/profile', {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) {
      console.warn('[auth] Server profile fetch returned', res.status);
      return null;
    }
    const data = await res.json();
    console.info('[auth] Server profile fetched — role:', data?.role, '| source:', data?._source);
    return data;
  } catch (err) {
    console.warn('[auth] Server profile fetch failed:', err.message);
    return null;
  }
}

// ── Client-side profile fetch (anon key — may be blocked by RLS) ─────────────
async function fetchProfileFromDB(userId) {
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        console.warn('[auth] Direct DB profile error:', error.message);
        return null;
      }
      return data || null;
    })
    .catch((err) => {
      console.warn('[auth] Direct DB profile unexpected error:', err.message);
      return null;
    });
}

// ── Role resolution: three-tier fallback ─────────────────────────────────────
// 1. Server endpoint (service role — always works)
// 2. Direct Supabase query (anon key — may be blocked by RLS)
// 3. JWT metadata → then email match (last resort)
async function resolveProfile(sessionUser) {
  if (!sessionUser?.id) return null;

  const userId = sessionUser.id;

  // ── Tier 1: get current JWT and ask the server ────────────────────────────
  let profile = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (jwt) {
      const timeout = new Promise((r) => setTimeout(() => r(null), 8000));
      profile = await Promise.race([fetchProfileFromServer(jwt), timeout]);
    }
  } catch (err) {
    console.warn('[auth] Could not get session JWT for server fetch:', err.message);
  }

  if (profile?.role) return profile;

  // ── Tier 2: direct Supabase query ────────────────────────────────────────
  const timeout = new Promise((r) => setTimeout(() => r(null), 5000));
  const dbProfile = await Promise.race([fetchProfileFromDB(userId), timeout]);
  if (dbProfile?.role) {
    console.info('[auth] Role from direct DB:', dbProfile.role);
    return dbProfile;
  }

  // ── Tier 3: JWT metadata ──────────────────────────────────────────────────
  const metaRole =
    sessionUser.app_metadata?.role ||
    sessionUser.user_metadata?.role;
  if (metaRole) {
    console.info('[auth] Role from JWT metadata:', metaRole);
    return { ...(dbProfile ?? {}), id: userId, role: metaRole };
  }

  // ── Tier 4: known admin email ─────────────────────────────────────────────
  if (sessionUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    console.info('[auth] Role from email fallback — assigning admin to:', sessionUser.email);
    return { ...(dbProfile ?? {}), id: userId, role: 'admin' };
  }

  console.warn('[auth] Could not resolve role — defaulting to "user". userId:', userId);
  return dbProfile; // may be null
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(ROLES.USER);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async (sessionUser) => {
    if (!sessionUser?.id) {
      setUser(null);
      setRole(ROLES.USER);
      return;
    }
    try {
      const profile = await resolveProfile(sessionUser);
      const r       = profile?.role ?? ROLES.USER;
      setUser({ ...sessionUser, role: r, profile: profile ?? null });
      setRole(r);
    } catch (err) {
      console.error('[auth] applySession error:', err);
      setUser({ ...sessionUser, role: ROLES.USER, profile: null });
      setRole(ROLES.USER);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await applySession(session.user);
  }, [applySession]);

  // ── Auth state subscription ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled      = false;
    let firstEventSeen = false;

    const safetyTimeout = setTimeout(() => {
      if (!firstEventSeen && !cancelled) {
        console.warn('[auth] INITIAL_SESSION did not fire within 6 s — defaulting to signed-out');
        firstEventSeen = true;
        setUser(null);
        setRole(ROLES.USER);
        setLoading(false);
      }
    }, 6000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;

        const isSubsequent = firstEventSeen &&
          (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED');

        if (isSubsequent) setLoading(true);

        await applySession(session?.user ?? null);

        if (!firstEventSeen) {
          firstEventSeen = true;
          clearTimeout(safetyTimeout);
        }
        if (!cancelled) setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [applySession]);

  // ── Auth actions ──────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Eagerly resolve the profile/role so UI updates immediately after sign-in
    const profile = await resolveProfile(data.user);
    const r       = profile?.role ?? ROLES.USER;
    setUser({ ...data.user, role: r, profile: profile ?? null });
    setRole(r);
    return data;
  }, []);

  const signup = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user?.id) {
      const profile = await resolveProfile(data.user);
      const r       = profile?.role ?? ROLES.USER;
      setUser({ ...data.user, role: r, profile: profile ?? null });
      setRole(r);
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(ROLES.USER);
  }, []);

  const value = { user, role, loading, login, signup, logout, refreshProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
