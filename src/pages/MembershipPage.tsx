import { Link } from 'react-router-dom';
import { useMembership } from '../modules/memberships';
import { useAuth } from '../hooks/useAuth';
import { MEMBERSHIP } from '../lib/membership';

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          '0.35rem',
      padding:      '0.25rem 0.75rem',
      borderRadius: '999px',
      fontSize:     '0.8rem',
      fontWeight:   700,
      background:   active ? 'rgba(134,239,172,0.15)' : 'rgba(251,191,36,0.12)',
      border:       `1px solid ${active ? 'rgba(134,239,172,0.4)' : 'rgba(251,191,36,0.3)'}`,
      color:        active ? '#86efac' : '#fbbf24',
    }}>
      {active ? '✓ Active' : '○ Inactive'}
    </span>
  );
}

const PERKS = [
  '🏆 Enter monthly contests',
  '🎬 Create and publish events',
  '❤️  Like and support creator entries',
  '📢 Early access to announcements',
  '🎁 Contribute to the monthly Reward Pool',
  '💬 Free Chat access for all members',
  '🎓 Creator Academy courses',
];

export default function MembershipPage() {
  const { user, loading: authLoading } = useAuth();
  const { membership, loading, hasAccess } = useMembership();

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

  const tierLabel = membership?.tier === 'enterprise'
    ? 'Enterprise'
    : membership?.tier === 'monthly'
      ? 'Monthly Creator'
      : null;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>🌟 Membership</h1>
        <p style={{ color: 'var(--text-muted, #888)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
          Manage your Studio Flow membership and unlock creator features.
        </p>
      </div>

      {/* Status card */}
      <div style={{
        background:    'var(--surface, #1a1a2e)',
        border:        '1px solid var(--border, #2a2a40)',
        borderRadius:  '14px',
        padding:       '1.5rem',
        marginBottom:  '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
              {tierLabel ?? 'Studio Flow Member'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #888)' }}>
              {user.email}
            </div>
          </div>
          <StatusBadge active={hasAccess} />
        </div>

        {membership?.started_at && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #888)', marginBottom: '0.5rem' }}>
            Member since {new Date(membership.started_at).toLocaleDateString()}
          </div>
        )}
        {membership?.expires_at && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #888)' }}>
            {hasAccess ? 'Renews' : 'Expired'} {new Date(membership.expires_at).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Free user upgrade banner */}
      {!hasAccess && (
        <div style={{
          padding:       '1.25rem',
          borderRadius:  '12px',
          background:    'rgba(251,191,36,0.08)',
          border:        '1px solid rgba(251,191,36,0.25)',
          marginBottom:  '1.5rem',
        }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: '#fbbf24', fontSize: '1rem' }}>
            🔒 Upgrade to Creator
          </p>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
            You're on the free plan. Upgrade to unlock contests, events, and more.
          </p>
          <a
            href={MEMBERSHIP.stripeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary"
            style={{ textDecoration: 'none', fontSize: '0.875rem' }}
          >
            {MEMBERSHIP.ctaShort}
          </a>
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted, #888)' }}>
            {MEMBERSHIP.trialBadge} · {MEMBERSHIP.label}
          </p>
        </div>
      )}

      {/* Active member perks */}
      {hasAccess && (
        <div style={{
          padding:      '1.25rem',
          borderRadius: '12px',
          background:   'rgba(134,239,172,0.06)',
          border:       '1px solid rgba(134,239,172,0.2)',
          marginBottom: '1.5rem',
        }}>
          <p style={{ margin: '0 0 0.75rem', fontWeight: 700, color: '#86efac' }}>
            Your active plan includes:
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {PERKS.map((perk) => (
              <li key={perk} style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
                {perk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Perks for free users */}
      {!hasAccess && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            What you unlock with a membership:
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {PERKS.map((perk) => (
              <li key={perk} style={{
                fontSize:  '0.875rem',
                color:     'rgba(255,255,255,0.6)',
                display:   'flex',
                alignItems: 'center',
                gap:       '0.5rem',
              }}>
                {perk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer links */}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted, #888)', flexWrap: 'wrap' }}>
        <Link to="/contests" style={{ color: 'inherit' }}>Browse Contests</Link>
        <Link to="/free-chat" style={{ color: 'inherit' }}>Free Chat</Link>
        <Link to="/subscription" style={{ color: 'inherit' }}>Billing & Subscription</Link>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted, #888)', marginTop: '1.5rem' }}>
        {MEMBERSHIP.refundPolicy}
      </p>
    </div>
  );
}
