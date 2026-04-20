import { useEffect, useState } from 'react';
import { getProfileById, updateProfile } from '../lib/profile';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load profile when user logs in
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    async function load() {
      const data = await getProfileById(user.id);
      setProfile(data);
      setLoading(false);
    }

    load();
  }, [user]);

  // Update profile
  async function saveProfile(updates) {
    if (!user) return null;

    const updated = await updateProfile(user.id, updates);
    setProfile(updated);
    return updated;
  }

  return {
    profile,
    loading,
    saveProfile,
  };
}
