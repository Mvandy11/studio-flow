/**
 * useMembership — reads subscription state from `profiles`.
 * Source of truth: profiles.subscription_active, subscription_status, current_period_end
 * (kept in sync by the Stripe webhook pipeline).
 *
 * Returns the same public API shape so Navbar, CreatorProfile, and Subscription
 * page need no changes:
 *   { membership, tier, meta, isActive, expiresAt, subscriptionStatus, currentPeriodEnd, loading }
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TIER_META = {
  monthly: { label: 'Monthly', color: 'rgba(96,165,250,0.9)',  bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  free:    { label: 'Free',    color: 'rgba(156,163,175,0.9)', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.25)' },
};

const EMPTY = { subscription_active: false, subscription_status: null, current_period_end: null };

export function useMembership(user) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);

    supabase
      .from('profiles')
      .select('subscription_active, subscription_status, current_period_end')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!cancelled) {
          setProfile(error || !data ? EMPTY : data);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Derived values (backward-compatible) ────────────────────────────────────
  const isActive           = !!profile?.subscription_active;
  const subscriptionStatus = profile?.subscription_status ?? null;
  const currentPeriodEnd   = profile?.current_period_end  ?? null;
  const tier               = isActive ? 'monthly' : 'free';
  const meta               = TIER_META[tier];
  const expiresAt          = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  return { membership: profile, tier, meta, isActive, expiresAt, subscriptionStatus, currentPeriodEnd, loading };
}
