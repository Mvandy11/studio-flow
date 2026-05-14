import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TIER_META = {
  free:       { label: 'Free',       color: 'rgba(156,163,175,0.9)', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.25)' },
  monthly:    { label: 'Monthly',    color: 'rgba(96,165,250,0.9)',  bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  enterprise: { label: 'Enterprise', color: '#f5a623',               bg: 'rgba(245,166,35,0.12)', border: 'rgba(245,166,35,0.3)' },
};

export function useMembership(user) {
  const [membership, setMembership] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!user) { setMembership(null); setLoading(false); return; }

    supabase
      .from('memberships')
      .select('tier, is_active, started_at, expires_at, stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          // Table may not exist yet — default to free
          setMembership({ tier: 'free', is_active: false });
        } else {
          setMembership(data);
        }
        setLoading(false);
      });
  }, [user]);

  const tier    = membership?.tier || 'free';
  const meta    = TIER_META[tier] ?? TIER_META.free;
  const isActive = !!membership?.is_active;
  const expiresAt = membership?.expires_at
    ? new Date(membership.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return { membership, tier, meta, isActive, expiresAt, loading };
}
