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

  // Initial fetch
  useEffect(() => {
    if (!user) { setMembership(null); setLoading(false); return; }

    supabase
      .from('memberships')
      .select('tier, is_active, started_at, expires_at, stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setMembership({ tier: 'free', is_active: false });
        } else {
          setMembership(data);
        }
        setLoading(false);
      });
  }, [user]);

  // Realtime: keep status in sync after Stripe webhook fires
  useEffect(() => {
    if (!user) return;

    // Watch memberships row for this user (is_active flips when webhook fires)
    const membershipCh = supabase
      .channel(`membership-row-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memberships', filter: `user_id=eq.${user.id}` },
        ({ new: newRow }) => {
          if (newRow && newRow.user_id) {
            setMembership((prev) => ({ ...prev, ...newRow }));
          }
        },
      )
      .subscribe();

    // Watch profiles.subscription_active as belt-and-suspenders fallback
    const profileCh = supabase
      .channel(`membership-profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        ({ new: newRow }) => {
          if (newRow?.subscription_active !== undefined) {
            setMembership((prev) => ({
              ...(prev ?? { tier: 'monthly' }),
              is_active: newRow.subscription_active,
            }));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membershipCh);
      supabase.removeChannel(profileCh);
    };
  }, [user]);

  const tier     = membership?.tier || 'free';
  const meta     = TIER_META[tier] ?? TIER_META.free;
  const isActive = !!membership?.is_active;
  const expiresAt = membership?.expires_at
    ? new Date(membership.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return { membership, tier, meta, isActive, expiresAt, loading };
}
