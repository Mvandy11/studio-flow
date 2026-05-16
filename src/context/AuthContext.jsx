import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ROLES } from '../lib/roles';

const AuthContext = createContext(null);

async function fetchProfile(userId) {
  if (!userId) return null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return data || null;
  } catch (_) {
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
      setUser({ ...sessionUser, role: r, profile });
      setRole(r);
    } catch (_) {
      setUser({ ...sessionUser, role: ROLES.USER, profile: null });
      setRole(ROLES.USER);
    }
  }, []);

  useEffect(() => {
    let cancelled      = false;
    let firstEventSeen = false;

    // Safety net: if INITIAL_SESSION never fires within 6s, unblock the UI
    const timeout = setTimeout(() => {
      if (!firstEventSeen && !cancelled) {
        firstEventSeen = true;
        setUser(null);
        setRole(ROLES.USER);
        setLoading(false);
      }
    }, 6000);

    // onAuthStateChange fires INITIAL_SESSION synchronously on subscribe.
    // That event carries a fresh, auto-refreshed token — the correct way to
    // read the initial auth state in Supabase JS v2.  Do NOT skip it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;

        await applySession(session?.user ?? null);

        // Resolve loading after the very first event (INITIAL_SESSION for a
        // fresh page load, or SIGNED_IN / SIGNED_OUT for in-session changes).
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
    setUser({ ...sessionUser, role: r, profile });
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
      setUser({ ...sessionUser, role: r, profile });
      setRole(r);
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(ROLES.USER);
  }, []);

  const value = { user, role, loading, login, signup, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
