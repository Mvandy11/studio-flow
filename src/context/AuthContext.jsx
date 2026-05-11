import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ROLES } from '../lib/roles';

const AuthContext = createContext(null);

async function fetchProfile(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return data || null;
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

    const profile = await fetchProfile(sessionUser.id);
    const r       = profile?.role ?? ROLES.USER;
    setUser({ ...sessionUser, role: r, profile });
    setRole(r);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (cancelled) return;

      await applySession(sessionUser ?? null);
      if (!cancelled) setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
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
