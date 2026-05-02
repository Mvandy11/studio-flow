import { useEffect, useState } from 'react';
import { login, signup, logout, getCurrentUser, onAuthStateChange } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { ROLES } from '../lib/roles';

export function useAuth() {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(ROLES.USER);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const current = await getCurrentUser();
    setUser(current);

    if (current?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', current.id)
        .maybeSingle();
      setRole(profile?.role ?? ROLES.USER);
    } else {
      setRole(ROLES.USER);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadUser();

    const { data: listener } = onAuthStateChange(async (_event, session) => {
      const authedUser = session?.user || null;
      setUser(authedUser);

      if (authedUser?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authedUser.id)
          .maybeSingle();
        setRole(profile?.role ?? ROLES.USER);
      } else {
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
