import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ROLES } from '../lib/roles';

const AuthContext = createContext(null);

// ── Profile fetch with hard 5-second timeout ─────────────────────────────────
// Using Promise.race with a resolving timeout (not rejecting) means
// fetchProfile ALWAYS completes within 5 s and never hangs login.
async function fetchProfile(userId) {
  if (!userId) return null;

  const query = supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        console.error('[auth] fetchProfile DB error:', error.message);
        return null;
      }
      return data || null;
    })
    .catch((err) => {
      console.error('[auth] fetchProfile unexpected error:', err.message);
      return null;
    });

  const timeout = new Promise((resolve) =>
    setTimeout(() => {
      console.warn('[auth] fetchProfile timed out (5 s) for userId:', userId);
      resolve(null);
    }, 5000)
  );

  return Promise.race([query, timeout]);
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(ROLES.USER);
  const [loading, setLoading] = useState(true);

  // Apply a session user: fetch their profile, derive role, update context state.
  const applySession = useCallback(async (sessionUser) => {
    if (!sessionUser?.id) {
      setUser(null);
      setRole(ROLES.USER);
      return;
    }
    try {
      const profile = await fetchProfile(sessionUser.id);
      const r       = profile?.role ?? ROLES.USER;

      if (!profile) {
        console.warn('[auth] No profile row found — role defaults to "user". userId:', sessionUser.id);
      } else {
        console.info('[auth] Profile loaded — role:', r, '| email:', sessionUser.email);
      }

      setUser({ ...sessionUser, role: r, profile: profile ?? null });
      setRole(r);
    } catch (err) {
      console.error('[auth] applySession error:', err);
      // Still keep the user signed in — just with the default role
      setUser({ ...sessionUser, role: ROLES.USER, profile: null });
      setRole(ROLES.USER);
    }
  }, []);

  // Re-fetch the profile from Supabase on demand (e.g. after a role upgrade).
  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await applySession(session.user);
  }, [applySession]);

  // ── Auth state subscription ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled      = false;
    let firstEventSeen = false;

    // Safety net: if INITIAL_SESSION never fires within 6 s, unblock the UI.
    const safetyTimeout = setTimeout(() => {
      if (!firstEventSeen && !cancelled) {
        console.warn('[auth] INITIAL_SESSION did not fire within 6 s — defaulting to signed-out');
        firstEventSeen = true;
        setUser(null);
        setRole(ROLES.USER);
        setLoading(false);
      }
    }, 6000);

    // Supabase v2: onAuthStateChange fires INITIAL_SESSION synchronously on
    // subscribe with a fresh auto-refreshed token.  For subsequent events
    // (SIGNED_IN / SIGNED_OUT / USER_UPDATED) we briefly re-lock loading so
    // that admin-gated pages wait for the new role before deciding to redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;

        const isSubsequent = firstEventSeen &&
          (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED');

        if (isSubsequent) {
          // Brief re-lock so role-gated pages see authLoading=true while the
          // fresh profile is fetched, preventing a premature redirect.
          setLoading(true);
        }

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
    // Eagerly set user/role so the UI updates before onAuthStateChange SIGNED_IN
    // fires.  fetchProfile has a 5 s timeout so this can't hang indefinitely.
    const sessionUser = data.user;
    const profile     = await fetchProfile(sessionUser?.id);
    const r           = profile?.role ?? ROLES.USER;
    setUser({ ...sessionUser, role: r, profile: profile ?? null });
    setRole(r);
    return data;
  }, []);

  const signup = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    const sessionUser = data.user;
    if (sessionUser?.id) {
      const profile = await fetchProfile(sessionUser.id);
      const r       = profile?.role ?? ROLES.USER;
      setUser({ ...sessionUser, role: r, profile: profile ?? null });
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
