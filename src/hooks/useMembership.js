/**
 * useMembership — stable, self-contained membership state hook.
 *
 * - Manages auth internally via supabase.auth.onAuthStateChange
 *   (no user prop required — eliminates prop-drift flicker)
 * - Queries profiles table for subscription fields
 * - Never crashes on null / unauthenticated state
 *
 * Primary API:  { membershipActive, membershipStatus, currentPeriodEnd, loading, error }
 * Compat shims: { isActive, tier, meta, expiresAt }  ← existing consumers keep working
 */
import { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';

const TIER_META = {
  monthly: { label: 'Monthly', color: 'rgba(96,165,250,0.9)',  bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  free:    { label: 'Free',    color: 'rgba(156,163,175,0.9)', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.25)' },
};

export function useMembership() {
  const [membershipActive, setMembershipActive] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile(userId) {
      if (!userId) {
        if (!cancelled) {
          setMembershipActive(false);
          setMembershipStatus(null);
          setCurrentPeriodEnd(null);
          setLoading(false);
          setError(null);
        }
        return;
      }

      try {
        const { data, error: err } = await supabase
          .from('profiles')
          .select('subscription_active, subscription_status, current_period_end')
          .eq('id', userId)
          .single();

        if (cancelled) return;
        if (err) throw err;

        setMembershipActive(data?.subscription_active ?? false);
        setMembershipStatus(data?.subscription_status ?? null);
        setCurrentPeriodEnd(data?.current_period_end  ?? null);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err?.message ?? 'Failed to load membership');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Listen to auth state changes — re-fetch whenever session changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        setLoading(true);
        fetchProfile(session?.user?.id ?? null);
      }
    );

    // Seed with the current session immediately (avoids waiting for the first event)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) fetchProfile(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      authSub.unsubscribe();
    };
  }, []);

  // ── Backward-compatible shims (Navbar / CreatorProfile / Subscription) ──────
  const isActive  = membershipActive;
  const tier      = isActive ? 'monthly' : 'free';
  const meta      = TIER_META[tier] ?? TIER_META.free;
  const expiresAt = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  return {
    membershipActive,
    membershipStatus,
    currentPeriodEnd,
    loading,
    error,
    // shims
    isActive,
    tier,
    meta,
    expiresAt,
  };
}
