import { useEffect, useState } from 'react';
import { login, signup, logout, getCurrentUser, onAuthStateChange } from '../lib/auth';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load current user on mount
  useEffect(() => {
    async function loadUser() {
      const current = await getCurrentUser();
      setUser(current);
      setLoading(false);
    }
    loadUser();

    // Listen for auth changes
    const { data: listener } = onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return {
    user,
    loading,
    login,
    signup,
    logout,
  };
}
