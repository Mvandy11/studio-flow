import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ROLES } from '../lib/roles';

const AuthContext = createContext(null);

async function fetchProfile(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[auth] fetchProfile DB error:', error.message);
      return null;
    }
    if (!data) {
      console.warn('[auth] fetchProfile returned no row for userId:', userId);
    }
    return data || null;
  } catch (err) {
    console.error('[auth] fetchProfile unexpected error:', err);
    return null;
  }
}

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
      const profile = await fetchProfile(sessionUser.id);
      const r       = profile?.role ?? ROLES.USER;

      if (!profile) {
        console.warn('[auth] No profile found — role defaults to user. userId:', sessionUser.id);
      } else {
        console.info('[auth] Profile loaded. role:', r, '| userId:', sessionUser.id);
      }

      setUser({ ...sessionUser, role: r, profile: profile ?? null });
      setRole(r);
    } catch (err) {
      console.error('[auth] applySession error:', err);
      // Still mark the user as signed in with default role so they aren't
      // silently redirected away on a transient DB error.
      setUser({ ...sessionUser, role: ROLES.USER, profile: null });
      setRole(ROLES.USER);
    }
  }, []);

  // Re-fetch the profile from Supabase and refresh role in context.
  // Call this after any operation that changes the profile (e.g. role upgrade).
  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await applySession(session.user);
  }, [applySession]);

  useEffect(() => {
    let cancelled      = false;
    let firstEventSeen = false;

    // Safety net: if INITIAL_SESSION never fires within 6 s, unblock the UI
    const timeout = setTimeout(() => {
      if (!firstEventSeen && !cancelled) {
        firstEventSeen = true;
        console.warn('[auth] INITIAL_SESSION did not fire within 6 s — defaulting to signed-out state');
        setUser(null);
        setRole(ROLES.USER);
        setLoading(false);
      }
    }, 6000);

    // In Supabase JS v2, onAuthStateChange fires INITIAL_SESSION synchronously
    // on subscribe, with a fresh auto-refreshed token.  This is the recommended
    // way to read initial auth state — do NOT skip this event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;

        await applySession(session?.user ?? null);

        if (!firstEventSeen) {
          firstEventSeen = true;
          clearTimeout(timeout);
          if (!cancelled) setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [applySession]);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

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
