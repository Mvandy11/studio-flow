import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMembership } from '../modules/memberships';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

// ── Stripe Payment Links ────────────────────────────────────────────────────
const STRIPE_MEMBER_30  = 'https://buy.stripe.com/7sYdRb2yx3JS1wwacZb7y0o';
const STRIPE_CREATOR_50 = 'https://buy.stripe.com/cNi6oJ1utcgo3EE4SFb7y0u';
const STRIPE_DONATION   = 'https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t';

const TIER_META: Record<string, { label: string; color: string; border: string; bg: string }> = {
  member_30:  { label: '$30 Member',  color: '#60a5fa', border: 'rgba(96,165,250,0.4)',   bg: 'rgba(96,165,250,0.1)'  },
  creator_50: { label: '$50 Creator', color: '#a78bfa', border: 'rgba(167,139,250,0.4)',  bg: 'rgba(167,139,250,0.1)' },
  free:       { label: 'Free',        color: 'rgba(200,200,215,0.45)', border: 'rgba(200,200,215,0.15)', bg: 'rgba(255,255,255,0.03)' },
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

const PERKS_30 = [
  '🏆 Enter monthly contests',
  '💬 Free Chat + community access',
  '📢 Early access to announcements',
  '❤️ Like and support creator submissions',
  '🎓 Creator Academy courses',
  '🎁 $10 of your membership funds the monthly Reward Pool',
];

const PERKS_50 = [
  ...PERKS_30,
  '🎬 Create and publish live or recorded events',
  '📡 Stream key + RTMP/HLS broadcasting',
  '💰 Donation collection on events',
  '🖼 AI enhance, upscale & denoise tools',
  '⚡ Priority review for event requests',
];

export default function MembershipPage() {
  const { user, loading: authLoading } = useAuth();
  const { membership, loading, hasAccess, tier } = useMembership();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError,   setPortalError]   = useState('');

  async function handleManageSubscription() {
    setPortalLoading(true);
    setPortalError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in.');
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
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
              {tier === 'creator_50' ? '🎬 Creator Member' : tier === 'member_30' ? '🌟 Studio Member' : 'Studio Flow Account'}
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

        {/* Manage button — active members only */}
        {hasAccess && (
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
              Update payment method · Cancel · View invoices
            </p>
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
            {tier === 'creator_50' ? '🎬 Creator Plan includes:' : '🌟 Member Plan includes:'}
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {(tier === 'creator_50' ? PERKS_50 : PERKS_30).map((perk) => (
              <li key={perk} style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>{perk}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Upgrade tiers (free users or upgrade prompts) ── */}
      {!hasAccess && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>

          {/* $30 Member tier */}
          <div style={{
            background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)',
            borderRadius: '14px', padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#60a5fa' }}>🌟 Studio Member</span>
                <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', color: 'rgba(200,200,215,0.4)' }}>Viewer + Community</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#60a5fa' }}>$30<span style={{ fontSize: '0.75rem', fontWeight: 500 }}>/mo</span></span>
            </div>
            <ul style={{ margin: '0 0 1rem', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {PERKS_30.map((p) => <li key={p} style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.7)' }}>{p}</li>)}
            </ul>
            <a
              href={STRIPE_MEMBER_30}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', textAlign: 'center', padding: '0.65rem',
                borderRadius: '10px', background: 'rgba(96,165,250,0.2)',
                border: '1px solid rgba(96,165,250,0.35)', color: '#60a5fa',
                fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
              }}
            >
              Join for $30/month
            </a>
          </div>

          {/* $50 Creator tier */}
          <div style={{
            background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)',
            borderRadius: '14px', padding: '1.5rem', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '-10px', right: '1rem',
              background: '#a78bfa', color: '#000', fontSize: '0.68rem',
              fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '999px',
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              Best Value
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#a78bfa' }}>🎬 Creator Member</span>
                <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', color: 'rgba(200,200,215,0.4)' }}>Full creator access</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#a78bfa' }}>$50<span style={{ fontSize: '0.75rem', fontWeight: 500 }}>/mo</span></span>
            </div>
            <ul style={{ margin: '0 0 1rem', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {PERKS_50.map((p) => <li key={p} style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.7)' }}>{p}</li>)}
            </ul>
            <a
              href={STRIPE_CREATOR_50}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', textAlign: 'center', padding: '0.65rem',
                borderRadius: '10px', background: 'rgba(167,139,250,0.2)',
                border: '1px solid rgba(167,139,250,0.4)', color: '#a78bfa',
                fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
              }}
            >
              Join for $50/month
            </a>
          </div>
        </div>
      )}

      {/* Upgrade prompt for $30 members wanting Creator */}
      {hasAccess && tier === 'member_30' && (
        <div style={{
          background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
          borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem',
        }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: '#a78bfa' }}>🎬 Upgrade to Creator ($50/mo)</p>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            Unlock event creation, live streaming, donations, and AI tools.
          </p>
          <a href={STRIPE_CREATOR_50} target="_blank" rel="noopener noreferrer"
            style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600 }}>
            Upgrade now →
          </a>
        </div>
      )}

      {/* ── Donation ── */}
      <div style={{
        background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)',
        borderRadius: '12px', padding: '1.1rem 1.25rem', marginBottom: '1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#f5a623' }}>💛 Support Studio Flow</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(200,200,215,0.5)' }}>
            One-time donation — any amount appreciated
          </p>
        </div>
        <a href={STRIPE_DONATION} target="_blank" rel="noopener noreferrer"
          style={{
            padding: '0.5rem 1.1rem', borderRadius: '8px',
            background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)',
            color: '#f5a623', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none',
          }}>
          Donate
        </a>
      </div>

      {/* ── Footer links ── */}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted, #888)', flexWrap: 'wrap' }}>
        <Link to="/contests" style={{ color: 'inherit' }}>Browse Contests</Link>
        <Link to="/free-chat" style={{ color: 'inherit' }}>Free Chat</Link>
        <Link to="/events" style={{ color: 'inherit' }}>Explore Events</Link>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted, #888)', marginTop: '1.5rem' }}>
        Payments processed securely by Stripe. Cancel anytime from the Stripe portal.
      </p>
    </div>
  );
}
