import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMembership } from '../hooks/useMembership';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import CancelMembershipButton from '../components/CancelMembershipButton';

const STRIPE_DONATION      = 'https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t';
const FOUNDING_CHECKOUT_URL = import.meta.env.VITE_FOUNDING_CHECKOUT_URL;

const TIER_META: Record<string, { label: string; color: string; border: string; bg: string }> = {
  founding: {
    label: '🔥 Founding Member',
    color: '#fabc50',
    border: 'rgba(250,188,80,0.4)',
    bg: 'rgba(250,188,80,0.08)',
  },
  member_30: {
    label: 'Member',
    color: '#60a5fa',
    border: 'rgba(96,165,250,0.4)',
    bg: 'rgba(96,165,250,0.1)',
  },
  creator_50: {
    label: 'Creator Member',
    color: '#a78bfa',
    border: 'rgba(167,139,250,0.4)',
    bg: 'rgba(167,139,250,0.1)',
  },
  free: {
    label: 'Free',
    color: 'rgba(200,200,215,0.45)',
    border: 'rgba(200,200,215,0.15)',
    bg: 'rgba(255,255,255,0.03)',
  },
};

function TierBadge({ tier }: { tier: string }) {
  const m = TIER_META[tier] ?? TIER_META.free;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      padding: '0.25rem 0.75rem', borderRadius: '999px',
      fontSize: '0.8rem', fontWeight: 700,
      background: m.bg, border: `1px solid ${m.border}`, color: m.color,
    }}>
      {tier === 'free' ? '○ Free Plan' : `✓ ${m.label}`}
    </span>
  );
}

const PERKS_FOUNDING = [
  '🔒 $25/mo locked forever (reg. $40/mo)',
  '🏅 Founding Member badge — permanent',
  '🏆 $10/mo fuels contest prizes',
  '🎬 $15/mo fuels event rewards',
  '⚡ Early access to every new feature',
  '💬 Priority support',
];

const PERKS_MEMBER = [
  '🏆 Enter monthly contests',
  '💬 Free Chat + community access',
  '📢 Early access to announcements',
  '❤️ Like and support creator submissions',
  '🎓 Creator Academy courses',
  '🎁 $10 of your membership funds the monthly Reward Pool',
];

const PERKS_CREATOR = [
  ...PERKS_MEMBER,
  '🎬 Create and publish live or recorded events',
  '📡 Stream key + RTMP/HLS broadcasting',
  '💰 Donation collection on events',
  '🖼 AI enhance, upscale & denoise tools',
  '⚡ Priority review for event requests',
  '🎁 $15 funds the Event Creator Pool',
];

export default function MembershipPage() {
  const { user, loading: authLoading } = useAuth();
  const { membership, loading, hasAccess, tier, refetch } = useMembership();

  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError]     = useState('');

  async function handleManageSubscription() {
    setPortalLoading(true);
    setPortalError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in.');
      const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
      const res  = await fetch(`${BASE}/api/stripe/create-portal-session`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to open billing portal.');
      window.location.href = json.url;
    } catch (err: any) {
      setPortalError(err.message);
      setPortalLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="cinematic-spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center', padding: '1rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Sign in to view your membership</h2>
        <Link to="/login" className="btn btn--primary">Log In</Link>
      </div>
    );
  }

  const periodEnd = membership?.current_period_end
    ? new Date(membership.current_period_end).toLocaleDateString()
    : null;
  const tierMeta = TIER_META[tier] ?? TIER_META.free;

  const perks = tier === 'founding'   ? PERKS_FOUNDING
    : tier === 'creator_50' ? PERKS_CREATOR
    : PERKS_MEMBER;

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>🌟 Membership</h1>
        <p style={{ color: 'var(--text-muted, #888)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
          Manage your Studio Flow membership and unlock creator features.
        </p>
      </div>

      {/* ── Status card ── */}
      <div style={{
        background: 'var(--surface, #1a1a2e)',
        border: '1px solid var(--border, #2a2a40)',
        borderRadius: '14px', padding: '1.5rem', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
              {tier === 'founding'   ? '🔥 Founding Member'
                : tier === 'creator_50' ? '🎬 Creator Member'
                : tier === 'member_30'  ? '🌟 Studio Member'
                : 'Studio Flow Account'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #888)' }}>{user.email}</div>
          </div>
          <TierBadge tier={tier} />
        </div>

        {periodEnd && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #888)', marginBottom: '1rem' }}>
            {hasAccess ? 'Renews' : 'Expired'} {periodEnd}
          </div>
        )}

        {membership?.membership_started_at && tier !== 'free' && (
          <div style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.4)', marginBottom: '1rem' }}>
            Member since {new Date(membership.membership_started_at).toLocaleDateString()}
          </div>
        )}

        {hasAccess && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.55rem 1.2rem', borderRadius: '10px',
                  border: `1px solid ${tierMeta.border}`,
                  background: portalLoading ? 'rgba(255,255,255,0.03)' : tierMeta.bg,
                  color: tierMeta.color, fontWeight: 700, fontSize: '0.875rem',
                  cursor: portalLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {portalLoading ? '…' : '⚙ Manage Subscription'}
              </button>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted, #888)' }}>
                Update payment method · View invoices
              </p>
            </div>
            <CancelMembershipButton memberTier={tier} onCancelled={refetch} />
          </div>
        )}

        {portalError && (
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: '#fca5a5' }}>{portalError}</p>
        )}
      </div>

      {/* ── Active member perks ── */}
      {hasAccess && (
        <div style={{
          padding: '1.25rem', borderRadius: '12px',
          background: tierMeta.bg, border: `1px solid ${tierMeta.border}`,
          marginBottom: '1.5rem',
        }}>
          <p style={{ margin: '0 0 0.75rem', fontWeight: 700, color: tierMeta.color }}>
            {tier === 'founding'   ? '🔥 Founding Member includes:'
              : tier === 'creator_50' ? '🎬 Creator Plan includes:'
              : '🌟 Member Plan includes:'}
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {perks.map((perk) => (
              <li key={perk} style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>{perk}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── No membership — Founding Member CTA ── */}
      {!hasAccess && (
        <div style={{
          background: 'rgba(250,188,80,0.06)', border: '1px solid rgba(250,188,80,0.25)',
          borderRadius: '14px', padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fabc50', marginBottom: '0.5rem' }}>
            🔥 Founding Member — $25/mo forever
          </div>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', margin: '0 0 0.75rem', lineHeight: '1.5' }}>
            Lock in $25/mo permanently before all 100 spots fill. After that, membership opens at $40/mo.
          </p>
          <ul style={{ margin: '0 0 1rem', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {PERKS_FOUNDING.map((p) => (
              <li key={p} style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.7)' }}>{p}</li>
            ))}
          </ul>
          {FOUNDING_CHECKOUT_URL ? (
            <a
              href={FOUNDING_CHECKOUT_URL}
              style={{
                display: 'block', textAlign: 'center', padding: '0.75rem',
                borderRadius: '10px', background: '#fabc50',
                color: '#000', fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none',
              }}
            >
              Claim Your Founding Spot →
            </a>
          ) : (
            <Link to="/" style={{
              display: 'block', textAlign: 'center', padding: '0.75rem',
              borderRadius: '10px', background: 'rgba(250,188,80,0.15)',
              border: '1px solid rgba(250,188,80,0.35)',
              color: '#fabc50', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
            }}>
              View Founding Member Offer →
            </Link>
          )}
        </div>
      )}

      {/* ── Donation ── */}
      <div style={{
        background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)',
        borderRadius: '12px', padding: '1.1rem 1.25rem', marginBottom: '1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#f5a623' }}>💛 Support Studio Flow</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(200,200,215,0.5)' }}>
            One-time donation — any amount appreciated
          </p>
        </div>
        <a href={STRIPE_DONATION} target="_blank" rel="noopener noreferrer" style={{ padding: '0.5rem 1.1rem', borderRadius: '8px', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', color: '#f5a623', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
          Donate
        </a>
      </div>

      {/* ── Footer links ── */}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted, #888)', flexWrap: 'wrap' }}>
        <Link to="/contests"  style={{ color: 'inherit' }}>Browse Contests</Link>
        <Link to="/free-chat" style={{ color: 'inherit' }}>Free Chat</Link>
        <Link to="/events"    style={{ color: 'inherit' }}>Explore Events</Link>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted, #888)', marginTop: '1.5rem' }}>
        Payments processed securely by Stripe. Cancel anytime using the button above.
      </p>

    </div>
  );
}
