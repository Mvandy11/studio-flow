import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ROLES } from '../lib/roles';

const AuthContext = createContext(null);

// ── Known admin email (permanent, per replit.md) ─────────────────────────────
const ADMIN_EMAIL = 'obviouslyinspiredstudio@outlook.com';

// ── Server-side profile fetch (service role → bypasses RLS) ──────────────────
async function fetchProfileFromServer(jwt) {
  try {
    const res = await fetch('/api/auth/profile', {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    console.info('[auth] Server profile — role:', data?.role, '| source:', data?._source);
    return data;
  } catch {
    return null;
  }
}

// ── Direct Supabase query (anon key — may be blocked by RLS) ─────────────────
async function fetchProfileFromDB(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) { console.warn('[auth] Direct DB error:', error.message); return null; }
    return data || null;
  } catch { return null; }
}

// ── Full async profile resolution (used for non-admin or background update) ───
// Tries server endpoint → direct DB → JWT metadata in order.
async function resolveProfileAsync(sessionUser, jwt) {
  if (!sessionUser?.id) return null;

  // Tier 1 — server endpoint with service role (bypasses RLS)
  if (jwt) {
    try {
      const serverProfile = await Promise.race([
        fetchProfileFromServer(jwt),
        new Promise((r) => setTimeout(() => r(null), 6000)),
      ]);
      if (serverProfile?.role) return serverProfile;
    } catch { /* fall through */ }
  }

  // Tier 2 — direct Supabase query (anon key)
  try {
    const dbProfile = await Promise.race([
      fetchProfileFromDB(sessionUser.id),
      new Promise((r) => setTimeout(() => r(null), 5000)),
    ]);
    if (dbProfile?.role) return dbProfile;
  } catch { /* fall through */ }

  // Tier 3 — JWT metadata
  const metaRole = sessionUser.app_metadata?.role || sessionUser.user_metadata?.role;
  if (metaRole) return { id: sessionUser.id, role: metaRole };

  return null;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(ROLES.USER);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async (sessionUser, jwt = null) => {
    if (!sessionUser?.id) {
      setUser(null);
      setRole(ROLES.USER);
      return;
    }

    // ── FAST PATH: known admin email ──────────────────────────────────────────
    // Set admin role immediately (synchronous) so the UI is never blocked
    // waiting on DB queries. The full profile is still fetched in the background
    // to populate display_name, avatar_url, etc.
    const isKnownAdmin = sessionUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    if (isKnownAdmin) {
      setUser({ ...sessionUser, role: 'admin', profile: null });
      setRole('admin');

      // Background: fetch full profile to fill in display fields
      resolveProfileAsync(sessionUser, jwt)
        .then((profile) => {
          if (profile) {
            const r = profile.role || 'admin';
            setUser((prev) => ({ ...(prev ?? sessionUser), role: r, profile }));
            setRole(r);
          }
        })
        .catch(() => { /* keep fast-path admin role */ });

      return;
    }

    // ── NORMAL PATH: async role resolution ───────────────────────────────────
    try {
      const profile = await resolveProfileAsync(sessionUser, jwt);
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
    await applySession(session.user, session.access_token);
  }, [applySession]);

  // ── Auth state subscription ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled      = false;
    let firstEventSeen = false;

    // Safety net: if INITIAL_SESSION never fires within 6 s, unblock the UI.
    const safetyTimeout = setTimeout(() => {
      if (!firstEventSeen && !cancelled) {
        console.warn('[auth] INITIAL_SESSION did not fire in 6 s — defaulting to signed-out');
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

        // Pass the JWT from the session directly — avoids a second getSession() call
        await applySession(session?.user ?? null, session?.access_token ?? null);

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
    // Eagerly apply session with the JWT from the sign-in response
    await applySession(data.user, data.session?.access_token);
    return data;
  }, [applySession]);

  const signup = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user?.id) {
      await applySession(data.user, data.session?.access_token);
    }
    return data;
  }, [applySession]);

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
