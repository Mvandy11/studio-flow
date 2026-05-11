import { useEffect, useState } from 'react';
import { login, signup, logout, getCurrentUser, onAuthStateChange } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { ROLES } from '../lib/roles';

async function fetchRole(userId) {
  if (!userId) return ROLES.USER;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return profile?.role ?? ROLES.USER;
}

export function useAuth() {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(ROLES.USER);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const current = await getCurrentUser();

    if (current?.id) {
      const r = await fetchRole(current.id);
      const merged = { ...current, role: r };
      setUser(merged);
      setRole(r);
    } else {
      setUser(null);
      setRole(ROLES.USER);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadUser();

    const { data: listener } = onAuthStateChange(async (_event, session) => {
      const authedUser = session?.user || null;

      if (authedUser?.id) {
        const r = await fetchRole(authedUser.id);
        setUser({ ...authedUser, role: r });
        setRole(r);
      } else {
        setUser(null);
        setRole(ROLES.USER);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return {
    user,
    role,
    loading,
    login,
    signup,
    logout,
  };
}
