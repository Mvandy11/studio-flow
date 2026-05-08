import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';

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
      { to: '/subscription',         icon: '🌟', label: 'Subscription' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/earnings', icon: '◎', label: 'Earnings' },
      { to: '/profile',  icon: '◉', label: 'Profile' },
    ],
  },
];

function useActiveContests() {
  const [contests, setContests] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch('/api/contests?status=active&limit=6');
        if (!res.ok) return;
        const json = await res.json();
        setContests(Array.isArray(json.data) ? json.data : []);
      } catch (_) {}
    }
    load();
  }, []);

  return contests;
}

export default function AppSidebar({ open, onClose }) {
  const { user, role, logout } = useAuth();
  const activeContests = useActiveContests();
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

              {/* Active contest sub-links — only shown under the Platform section */}
              {section.label === 'Platform' && activeContests.length > 0 && (
                <div style={{ paddingLeft: '1.25rem', marginTop: '0.15rem', marginBottom: '0.25rem' }}>
                  {activeContests.map((c) => (
                    <NavLink
                      key={c.id}
                      to={`/contests/${c.id}`}
                      className={({ isActive }) =>
                        `app-sidebar__link app-sidebar__link--sub${isActive ? ' active' : ''}`
                      }
                      onClick={onClose}
                      style={{ fontSize: '0.78rem', paddingTop: '0.3rem', paddingBottom: '0.3rem', opacity: 0.8 }}
                    >
                      <span className="app-sidebar__link-icon" style={{ fontSize: '0.7rem' }}>›</span>
                      {c.title}
                    </NavLink>
                  ))}
                </div>
              )}
            </nav>
            <div className="app-sidebar__divider" />
          </div>
        ))}

        {/* Admin link (creator_admin only) */}
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
            </nav>
            <div className="app-sidebar__divider" />
          </>
        )}

        <div className="app-sidebar__spacer" />

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
