import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { requireMembership } from './requireMembership';
import { useAuth } from '../../hooks/useAuth';
import type { ProfileSubscription } from '../../lib/types';

export interface UseMembershipResult {
  membership: ProfileSubscription | null;
  loading: boolean;
  error: string | null;
  /** True when the user has full premium access (admin, webhook, or payment link) */
  hasAccess: boolean;
  /** Membership tier: 'free' | 'member_30' | 'creator_50' */
  tier: string;
}

const EMPTY: ProfileSubscription = {
  subscription_active:  false,
  subscription_status:  null,
  current_period_end:   null,
  membership_active:    false,
  membership_tier:      'free',
  membership_started_at: null,
  has_access:           false,
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
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;

        if (!jwt) {
          if (!cancelled) { setMembership(null); setLoading(false); }
          return;
        }

        const res = await fetch('/api/auth/membership', {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (cancelled) return;
        if (!res.ok) throw new Error(`Membership request failed (${res.status})`);

        const data: ProfileSubscription = await res.json();
        if (!cancelled) {
          setMembership(data ?? EMPTY);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError((err as Error)?.message ?? 'Failed to load membership');
          setMembership(EMPTY);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const hasAccess = requireMembership({
    role,
    subscriptionActive: membership?.subscription_active,
    membershipActive:   membership?.membership_active,
    hasAccessFlag:      membership?.has_access,
  });

  const tier = membership?.membership_tier ?? 'free';

  return { membership, loading, error, hasAccess, tier };
}
