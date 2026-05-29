import { Link } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';

export default function StudioSidebar({ current, onSelect }) {
  const { profile } = useProfile();

  // ── Membership label ──────────────────────────────────────
  function getMembershipLabel() {
    if (!profile) return '';
    // API returns subscription_active + membership_tier
    const active = profile.subscription_active || profile.membership_active;
    if (active) {
      if (profile.membership_tier === 'creator_50') return '$50 Creator';
      if (profile.membership_tier === 'member_30')  return '$30 Member';
    }
    return 'Free Member';
  }

  // ── Payout method status ──────────────────────────────────
  function getPayoutStatus() {
    if (!profile) return null;
    const method = profile.payout_method;
    if (!method) return { label: 'No payout method', dot: '#f87171' };
    if (method === 'stripe' && !profile.stripe_connect_onboarded)
      return { label: 'Stripe not connected', dot: '#fbbf24' };
    const icons = { paypal: '💙', venmo: '💸', cashapp: '💚', stripe: '🔵' };
    return { label: `${icons[method] || '💳'} ${method}`, dot: '#4ade80' };
  }

  const links = [
    { key: 'overview',   label: 'Overview'   },
    { key: 'sessions',   label: 'Sessions'   },
    { key: 'posts',      label: 'Posts'      },
    { key: 'analytics',  label: 'Analytics'  },
    { key: 'settings',   label: 'Settings'   },
  ];

  const payoutStatus = getPayoutStatus();

  return (
    <aside style={{
      width: '240px', height: '100vh', position: 'fixed', top: 0, left: 0,
      padding: '5rem 1rem 2rem', background: 'rgba(14,14,17,0.6)',
      backdropFilter: 'blur(16px)', borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', gap: '0.25rem', zIndex: 900,
    }}>

      {/* Membership badge */}
      {profile && (
        <div style={{
          marginBottom: '1rem', padding: '0.4rem 0.75rem',
          background: 'rgba(255,255,255,0.06)', borderRadius: '8px',
          fontSize: '0.85rem', color: '#fff', textAlign: 'center', fontWeight: 600,
        }}>
          {getMembershipLabel()}
        </div>
      )}

      {/* Nav links */}
      {links.map(({ key, label }) => (
        <button
          key={key}
          className={`cinematic-sidebar-link${current === key ? ' active' : ''}`}
          onClick={() => onSelect(key)}
        >
          {label}
        </button>
      ))}

      {/* Premier Payout Settings — bottom */}
      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Payout status pill */}
        {payoutStatus && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.72rem', color: 'rgba(200,200,215,0.45)',
            marginBottom: '0.5rem', paddingLeft: '0.25rem',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: payoutStatus.dot, flexShrink: 0,
            }} />
            {payoutStatus.label}
          </div>
        )}

        <Link
          to="/premier/settings"
          className="cinematic-sidebar-link"
          style={{ display: 'block', color: 'var(--accent-gold)', textDecoration: 'none' }}
        >
          ✦ Premier Payout Settings
        </Link>
      </div>
    </aside>
  );
}
