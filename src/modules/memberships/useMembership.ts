/**
 * useMembership — stable, self-contained membership state hook.
 *
 * - Manages auth internally via supabase.auth.onAuthStateChange
 *   (no user prop — eliminates prop-drift flicker)
 * - Fetches membership state from GET /api/auth/membership
 *   (service-role key on server — bypasses RLS, always authoritative)
 * - Never crashes on null / unauthenticated state
 *
 * Primary API:  { membershipActive, membershipStatus, currentPeriodEnd, loading, error }
 * Compat shims: { isActive, tier, meta, expiresAt, hasAccess, membership }
 *               ↑ Navbar / CreatorProfile / Subscription / MembershipPage
 */
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

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
  // ── FIX 1: track membership_tier and has_access from API ──────────────────
  const [membershipTier,   setMembershipTier]   = useState('free');
  const [hasAccess,        setHasAccess]         = useState(false);
  const [membershipData,   setMembershipData]    = useState(null);
  // ─────────────────────────────────────────────────────────────────────────
  const [loading,          setLoading]           = useState(true);
  const [error,            setError]             = useState(null);

  useEffect(() => {
    let cancelled = false;

    function reset() {
      if (cancelled) return;
      setMembershipActive(DEFAULTS.active);
      setMembershipStatus(DEFAULTS.status);
      setCurrentPeriodEnd(DEFAULTS.periodEnd);
      setMembershipTier('free');
      setHasAccess(false);
      setMembershipData(null);
      setLoading(false);
      setError(null);
    }

    async function fetchMembership(userId) {
      if (!userId) { reset(); return; }

      if (!cancelled) setLoading(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;

        if (!jwt) { if (!cancelled) reset(); return; }

        // ── FIX (URL): prefix with VITE_API_BASE_URL so the request reaches
        //               the Render backend, not the Netlify CDN ────────────
        const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
        const res = await fetch(`${BASE}/api/auth/membership`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (cancelled) return;
        if (!res.ok) throw new Error(`Membership request failed (${res.status})`);

        const data = await res.json();
        if (!cancelled) {
          setMembershipActive(data?.membership_active    ?? false);
          setMembershipStatus(data?.subscription_status ?? null);
          setCurrentPeriodEnd(data?.current_period_end  ?? null);
          // ── FIX 1 cont: populate tier and hasAccess from API response ──
          setMembershipTier(data?.membership_tier ?? 'free');
          setHasAccess(data?.has_access           ?? false);
          setMembershipData(data);
          // ──────────────────────────────────────────────────────────────
          setError(null);
        }
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
        fetchMembership(session?.user?.id ?? null);
      }
    );

    // Seed immediately with the current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) fetchMembership(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      authSub.unsubscribe();
    };
  }, []);

  // ── Backward-compatible shims ────────────────────────────────────────────
  const isActive = membershipActive || hasAccess;
  // ── FIX 2: tier now reflects actual membership_tier from API, not hardcoded 'monthly' ──
  const tier     = isActive ? (membershipTier || 'free') : 'free';
  const meta     = TIER_META[tier] ?? TIER_META.free;
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
    // ── FIX 3: expose hasAccess and membership so MembershipPage.tsx gets real values ──
    hasAccess,
    membership: membershipData,
    membershipTier,
    // ────────────────────────────────────────────────────────────────────────
    isActive,
    tier,
    meta,
    expiresAt,
  };
}
