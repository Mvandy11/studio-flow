import { useEffect, useState } from 'react';
import { getProfileById, updateProfile } from '../lib/profile';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getProfileById(user.id);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  async function saveProfile(updates) {
    if (!user) return null;
    try {
      const updated = await updateProfile(user.id, updates);
      setProfile(updated);
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to save profile');
      return null;
    }
  }

  return { profile, loading, error, saveProfile };
}
