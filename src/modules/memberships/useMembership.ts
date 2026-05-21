import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { requireMembership } from './requireMembership';
import { useAuth } from '../../hooks/useAuth';
import type { ProfileSubscription } from '../../lib/types';

export interface UseMembershipResult {
  membership: ProfileSubscription | null;
  loading: boolean;
  error: string | null;
  /** True when the user has full access (admin or subscription_active) */
  hasAccess: boolean;
}

const EMPTY: ProfileSubscription = {
  subscription_active: false,
  subscription_status: null,
  current_period_end:  null,
};

export function useMembership(): UseMembershipResult {
  const { user, role } = useAuth();
  const [membership, setMembership] = useState<ProfileSubscription | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setMembership(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from('profiles')
      .select('subscription_active, subscription_status, current_period_end')
      .eq('id', user.id)
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        setMembership(err || !data ? EMPTY : (data as ProfileSubscription));
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setMembership(EMPTY);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  const hasAccess = requireMembership({
    role,
    subscriptionActive: membership?.subscription_active,
  });

  return { membership, loading, error, hasAccess };
}
