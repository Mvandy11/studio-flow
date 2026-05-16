import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';

const DONATION_URL = 'https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t';

const NAV_SECTIONS = [
  {
    items: [
      { to: '/',      icon: '⌂', label: 'Home',   end: true },
      { to: '/feed',  icon: '◈', label: 'Feed' },
      { to: '/studio',icon: '⬡', label: 'Studio' },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { to: '/tools/denoise', icon: '♫', label: 'Denoise' },
      { to: '/tools/upscale', icon: '⤢', label: 'Upscale' },
      { to: '/tools/enhance', icon: '✦', label: 'Enhance' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/custom-event-request', icon: '🎬', label: 'Custom Events' },
      { to: '/contests',             icon: '🏆', label: 'Contests' },
      { to: '/submissions',          icon: '📬', label: 'Submissions' },
      { to: '/announcements',        icon: '📢', label: 'Announcements' },
      { to: '/creator-academy',      icon: '🎓', label: 'Academy' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/earnings',         icon: '◎', label: 'Earnings' },
      { to: '/settings/payouts', icon: '💳', label: 'Payout Settings' },
      { to: '/profile',          icon: '◉', label: 'Profile' },
    ],
  },
];

export default function AppSidebar({ open, onClose }) {
  const { user, role, logout } = useAuth();
  const initial = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`app-sidebar-backdrop${open ? ' app-sidebar-backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`app-sidebar${open ? ' app-sidebar--open' : ''}`}>
        {/* Logo */}
        <Link to="/" className="app-sidebar__logo" onClick={onClose}>
          <div className="app-sidebar__logo-mark">S</div>
          <span className="app-sidebar__logo-text">Studio Flow</span>
        </Link>

        <div className="app-sidebar__divider" />

        {/* Nav sections */}
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <div className="app-sidebar__section-label">{section.label}</div>
            )}
            <nav className="app-sidebar__nav">
              {section.items.map(({ to, icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `app-sidebar__link${isActive ? ' active' : ''}`
                  }
                  onClick={onClose}
                >
                  <span className="app-sidebar__link-icon">{icon}</span>
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="app-sidebar__divider" />
          </div>
        ))}

        {/* Admin links */}
        {isCreatorAdmin(role) && (
          <>
            <nav className="app-sidebar__nav">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `app-sidebar__link app-sidebar__admin-link${isActive ? ' active' : ''}`
                }
                onClick={onClose}
              >
                <span className="app-sidebar__link-icon">🛡</span>
                Admin
                <span className="app-sidebar__badge">Admin</span>
              </NavLink>
              <NavLink
                to="/admin/event-requests"
                className={({ isActive }) =>
                  `app-sidebar__link app-sidebar__admin-link${isActive ? ' active' : ''}`
                }
                onClick={onClose}
              >
                <span className="app-sidebar__link-icon">🗂</span>
                Event Requests
              </NavLink>
              <NavLink
                to="/admin/winners"
                className={({ isActive }) =>
                  `app-sidebar__link app-sidebar__admin-link${isActive ? ' active' : ''}`
                }
                onClick={onClose}
              >
                <span className="app-sidebar__link-icon">🏆</span>
                Winners
              </NavLink>
              <NavLink
                to="/admin/analytics"
                className={({ isActive }) =>
                  `app-sidebar__link app-sidebar__admin-link${isActive ? ' active' : ''}`
                }
                onClick={onClose}
              >
                <span className="app-sidebar__link-icon">📊</span>
                Analytics
              </NavLink>
            </nav>
            <div className="app-sidebar__divider" />
          </>
        )}

        <div className="app-sidebar__spacer" />

        {/* Donate link */}
        <div style={{ padding: '0 0.625rem', marginBottom: '0.5rem' }}>
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="app-sidebar__donate-link"
          >
            <span className="app-sidebar__link-icon">💝</span>
            Support Studio Flow
          </a>
        </div>

        {/* User info */}
        {user && (
          <div className="app-sidebar__user">
            <div className="app-sidebar__avatar">{initial}</div>
            <div className="app-sidebar__user-info">
              <div className="app-sidebar__user-email">{user.email}</div>
            </div>
            <button
              className="app-sidebar__logout"
              onClick={() => { logout(); onClose?.(); }}
              title="Log out"
            >
              ⏻
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
