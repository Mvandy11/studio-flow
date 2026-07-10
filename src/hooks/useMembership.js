/**
 * useMembership — stable, self-contained membership state hook.
 *
 * - Manages auth internally via supabase.auth.onAuthStateChange
 * - Fetches membership state from GET /api/auth/membership
 * - Exposes refetch() so components can force a re-fetch after cancel
 */

import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase';

const TIER_META = {
  creator_50: { label: '$50 Creator', color: 'rgba(167,139,250,0.9)', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  member_30:  { label: '$30 Member',  color: 'rgba(96,165,250,0.9)',  bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  free:       { label: 'Free',        color: 'rgba(156,163,175,0.9)', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.25)' },
};

const DEFAULTS = { active: false, status: null, periodEnd: null };

export function useMembership() {
  const [membershipActive, setMembershipActive] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(null);
  const [membershipTier, setMembershipTier]     = useState('free');
  const [hasAccess, setHasAccess]               = useState(false);
  const [membershipData, setMembershipData]     = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState(null);
  const [userId, setUserId]                     = useState(null);

  function reset() {
    setMembershipActive(DEFAULTS.active);
    setMembershipStatus(DEFAULTS.status);
    setCurrentPeriodEnd(DEFAULTS.periodEnd);
    setMembershipTier('free');
    setHasAccess(false);
    setMembershipData(null);
    setLoading(false);
    setError(null);
  }

  const fetchMembership = useCallback(async (uid) => {
    if (!uid) { reset(); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) { reset(); return; }

      const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
      const res  = await fetch(`${BASE}/api/auth/membership`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!res.ok) throw new Error(`Membership request failed (${res.status})`);
      const data = await res.json();

      setMembershipActive(data?.membership_active ?? false);
      setMembershipStatus(data?.subscription_status ?? null);
      setCurrentPeriodEnd(data?.current_period_end ?? null);
      setMembershipTier(data?.membership_tier ?? 'free');
      setHasAccess(data?.has_access ?? false);
      setMembershipData(data);
      setError(null);
    } catch (err) {
      setError(err?.message ?? 'Failed to load membership');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auth listener — sets userId, triggers fetch ───────────────────────
  useEffect(() => {
    let cancelled = false;

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        const uid = session?.user?.id ?? null;
        setUserId(uid);
        fetchMembership(uid);
      }
    );

    // Initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      fetchMembership(uid);
    });

    return () => {
      cancelled = true;
      authSub.unsubscribe();
    };
  }, [fetchMembership]);

  // ── Public refetch — call this after cancel to force UI update ────────
  const refetch = useCallback(() => {
    fetchMembership(userId);
  }, [fetchMembership, userId]);

  const isActive = membershipActive || hasAccess;
  const tier     = isActive ? (membershipTier || 'free') : 'free';
  const meta     = TIER_META[tier] ?? TIER_META.free;
  const expiresAt = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return {
    membershipActive,
    membershipStatus,
    currentPeriodEnd,
    loading,
    error,
    hasAccess,
    membership: membershipData,
    membershipTier,
    isActive,
    tier,
    meta,
    expiresAt,
    refetch,  // ← NEW: call this to force re-fetch after cancel
  };
}
