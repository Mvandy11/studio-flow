import { useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';

const NAV_LINKS = [
  { to: '/',                label: 'Home',            icon: '⌂', end: true },
  { to: '/feed',            label: 'Feed',            icon: '◈' },
  { to: '/studio',          label: 'Studio',          icon: '⬡' },
  { to: '/tools/denoise',   label: 'AI Denoise',      icon: '♫' },
  { to: '/tools/upscale',   label: 'AI Upscale',      icon: '⤢' },
  { to: '/tools/enhance',   label: 'AI Enhance',      icon: '✦' },
  { to: '/events',          label: 'Events',          icon: '🎟' },
  { to: '/contests',        label: 'Contests',        icon: '🏆' },
  { to: '/announcements',   label: 'Announcements',   icon: '📢' },
  { to: '/creator-academy', label: 'Academy',         icon: '🎓' },
  { to: '/subscription',    label: 'Subscription',    icon: '🌟' },
  { to: '/earnings',        label: 'Earnings',        icon: '◎' },
  { to: '/profile',         label: 'Profile',         icon: '◉' },
];

export default function MobileDrawer({ open, onClose }) {
  const { user, role, logout } = useAuth();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div
        className={`mob-backdrop${open ? ' mob-backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`mob-drawer${open ? ' mob-drawer--open' : ''}`}
        aria-label="Mobile navigation"
        role="dialog"
        aria-modal="true"
      >
        <div className="mob-drawer__header">
          <Link to="/" className="mob-drawer__logo" onClick={onClose}>
            Studio Flow
          </Link>
          <button className="mob-drawer__close" onClick={onClose} aria-label="Close menu">✕</button>
        </div>

        <nav className="mob-drawer__nav">
          {NAV_LINKS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `mob-drawer__link${isActive ? ' mob-drawer__link--active' : ''}`
              }
              onClick={onClose}
            >
              <span className="mob-drawer__link-icon">{icon}</span>
              {label}
            </NavLink>
          ))}

          {isCreatorAdmin(role) && (
            <>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `mob-drawer__link${isActive ? ' mob-drawer__link--active' : ''}`
                }
                onClick={onClose}
                style={{ color: 'var(--accent-gold)' }}
              >
                <span className="mob-drawer__link-icon">🛡</span>
                Admin
              </NavLink>
              <NavLink
                to="/admin/event-requests"
                className={({ isActive }) =>
                  `mob-drawer__link${isActive ? ' mob-drawer__link--active' : ''}`
                }
                onClick={onClose}
                style={{ color: 'var(--accent-gold)' }}
              >
                <span className="mob-drawer__link-icon">🗂</span>
                Event Requests
              </NavLink>
            </>
          )}
        </nav>

        <div className="mob-drawer__divider" />

        <div className="mob-drawer__auth">
          {user ? (
            <button
              className="mob-drawer__logout"
              onClick={() => { logout(); onClose(); }}
            >
              Log Out
            </button>
          ) : (
            <Link to="/" className="mob-drawer__login" onClick={onClose}>Log In</Link>
          )}
        </div>
      </aside>
    </>
  );
}
