import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
      // Profile fetch failed — still mark the user as logged in with default role
      setUser({ ...sessionUser, role: ROLES.USER, profile: null });
      setRole(ROLES.USER);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // getSession() reads from localStorage — instant, no network call.
        // getUser() makes a round-trip to Supabase to re-validate the JWT and
        // can hang indefinitely if the connection is slow or env vars are wrong.
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        await applySession(session?.user ?? null);
      } catch (_) {
        if (!cancelled) {
          setUser(null);
          setRole(ROLES.USER);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        // INITIAL_SESSION fires synchronously before our init() resolves —
        // skip it so we don't double-apply and risk a race with setLoading.
        if (event === 'INITIAL_SESSION') return;
        await applySession(session?.user ?? null);
      }
    );

    return () => {
      cancelled = true;
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
