import { Link } from 'react-router-dom';
import useProfile from '../hooks/useProfile';


export default function StudioSidebar({ current, onSelect }) {
  const { profile } = useProfile();

  // ⭐ Membership label logic
  function getMembershipLabel() {
    if (!profile) return '';
    if (profile.membership_active) {
      if (profile.membership_tier === 'creator_50') return 'Creator Member';
      if (profile.membership_tier === 'member_30') return 'Member';
    }
    return 'Free Member';
  }

  const links = [
    { key: 'overview', label: 'Overview' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'posts', label: 'Posts' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <aside
      style={{
        width: '240px',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        padding: '5rem 1rem 2rem',
        background: 'rgba(14,14,17,0.6)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        zIndex: 900,
      }}
    >
      {/* ⭐ Membership Badge */}
      {profile && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          {getMembershipLabel()}
        </div>
      )}

      {links.map(({ key, label }) => (
        <button
          key={key}
          className={`cinematic-sidebar-link${current === key ? ' active' : ''}`}
          onClick={() => onSelect(key)}
        >
          {label}
        </button>
      ))}

      <div
        style={{
          marginTop: 'auto',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link
          to="/premier/settings"
          className="cinematic-sidebar-link"
          style={{
            display: 'block',
            color: 'var(--accent-gold)',
            textDecoration: 'none',
          }}
        >
          ✦ Premier Payout Settings
        </Link>
      </div>
    </aside>
  );
}
