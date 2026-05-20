import { useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';

const DONATION_URL = 'https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t';

const NAV_LINKS = [
  { to: '/',                     label: 'Home',          icon: '⌂', end: true },
  { to: '/feed',                 label: 'Feed',          icon: '◈' },
  { to: '/studio',               label: 'Studio',        icon: '⬡' },
  { to: '/tools/denoise',        label: 'AI Denoise',    icon: '♫' },
  { to: '/tools/upscale',        label: 'AI Upscale',    icon: '⤢' },
  { to: '/tools/enhance',        label: 'AI Enhance',    icon: '✦' },
  { to: '/custom-event-request', label: 'Custom Events', icon: '🎬' },
  { to: '/contests',             label: 'Contests',      icon: '🏆' },
  { to: '/submissions',          label: 'Submissions',   icon: '📬' },
  { to: '/announcements',        label: 'Announcements', icon: '📢' },
  { to: '/free-chat',            label: 'Free Chat',     icon: '💬' },
  { to: '/creator-academy',      label: 'Academy',       icon: '🎓' },
  { to: '/earnings',             label: 'Earnings',      icon: '◎' },
  { to: '/settings/payouts',     label: 'Payout Settings', icon: '💳' },
  { to: '/profile',              label: 'Profile',       icon: '◉' },
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
              <NavLink
                to="/admin/winners"
                className={({ isActive }) =>
                  `mob-drawer__link${isActive ? ' mob-drawer__link--active' : ''}`
                }
                onClick={onClose}
                style={{ color: 'var(--accent-gold)' }}
              >
                <span className="mob-drawer__link-icon">🏆</span>
                Winners
              </NavLink>
              <NavLink
                to="/admin/analytics"
                className={({ isActive }) =>
                  `mob-drawer__link${isActive ? ' mob-drawer__link--active' : ''}`
                }
                onClick={onClose}
                style={{ color: 'var(--accent-gold)' }}
              >
                <span className="mob-drawer__link-icon">📊</span>
                Analytics
              </NavLink>
            </>
          )}
        </nav>

        <div className="mob-drawer__divider" />

        {/* Donate */}
        <a
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mob-drawer__link"
          style={{ color: 'var(--accent-gold)', padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}
          onClick={onClose}
        >
          <span className="mob-drawer__link-icon">💝</span>
          Support Studio Flow
        </a>

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
            <Link to="/login" className="mob-drawer__login" onClick={onClose}>Log In</Link>
          )}
        </div>
      </aside>
    </>
  );
}
