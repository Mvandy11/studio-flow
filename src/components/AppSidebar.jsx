import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';
import { useMembership } from '../modules/memberships/useMembership';

const DONATION_URL = 'https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t';

export default function AppSidebar({ open, onClose }) {
  const { user, role, logout } = useAuth();
  const { tier }               = useMembership();
  const initial                = user?.email?.[0]?.toUpperCase() ?? '?';

  const isCreator50 = tier === 'creator_50';
  const isMember30  = tier === 'member_30';
  const isFree      = !isCreator50 && !isMember30;

  return (
    <>
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

        {/* Core nav */}
        <nav className="app-sidebar__nav">
          {[
            { to: '/',     icon: '⌂', label: 'Home',   end: true },
            { to: '/feed', icon: '◈', label: 'Feed' },
            { to: '/events', icon: '🎬', label: 'Events' },
            { to: '/studio', icon: '⬡', label: 'Studio' },
          ].map(({ to, icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `app-sidebar__link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="app-sidebar__link-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar__divider" />

        {/* AI Tools */}
        <div className="app-sidebar__section-label">AI Tools</div>
        <nav className="app-sidebar__nav">
          {[
            { to: '/tools/denoise', icon: '♫', label: 'Denoise' },
            { to: '/tools/upscale', icon: '⤢', label: 'Upscale' },
            { to: '/tools/enhance', icon: '✦', label: 'Enhance' },
          ].map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `app-sidebar__link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="app-sidebar__link-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar__divider" />

        {/* Platform */}
        <div className="app-sidebar__section-label">Platform</div>
        <nav className="app-sidebar__nav">
          {[
            { to: '/contests',        icon: '🏆', label: 'Contests' },
            { to: '/submissions',     icon: '📬', label: 'Submissions' },
            { to: '/announcements',   icon: '📢', label: 'Announcements' },
            { to: '/free-chat',       icon: '💬', label: 'Free Chat' },
            { to: '/creator-academy', icon: '🎓', label: 'Academy' },
          ].map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `app-sidebar__link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="app-sidebar__link-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar__divider" />

        {/* Account — tier-aware */}
        <div className="app-sidebar__section-label">Account</div>
        <nav className="app-sidebar__nav">
          {/* Tier-based dashboard link */}
          {isFree && (
            <NavLink
              to="/membership"
              className={({ isActive }) => `app-sidebar__link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="app-sidebar__link-icon">⭐</span>
              Membership
            </NavLink>
          )}
          {isMember30 && (
            <NavLink
              to="/events"
              className={({ isActive }) => `app-sidebar__link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="app-sidebar__link-icon">🌟</span>
              Dashboard
            </NavLink>
          )}
          {isCreator50 && (
            <NavLink
              to="/earnings"
              className={({ isActive }) => `app-sidebar__link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="app-sidebar__link-icon">🎬</span>
              Creator Dashboard
            </NavLink>
          )}

          {[
            { to: '/earnings', icon: '◎', label: 'Earnings' },
            { to: '/profile',  icon: '◉', label: 'Profile' },
          ].map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `app-sidebar__link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="app-sidebar__link-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar__divider" />

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
                to="/creator/new-event"
                className={({ isActive }) =>
                  `app-sidebar__link app-sidebar__admin-link${isActive ? ' active' : ''}`
                }
                onClick={onClose}
              >
                <span className="app-sidebar__link-icon">🎬</span>
                Post Event
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
              <NavLink
                to="/admin/errors"
                className={({ isActive }) =>
                  `app-sidebar__link app-sidebar__admin-link${isActive ? ' active' : ''}`
                }
                onClick={onClose}
              >
                <span className="app-sidebar__link-icon">🔴</span>
                Error Logs
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
              {tier && tier !== 'free' && (
                <div style={{ fontSize: '0.68rem', color: tier === 'creator_50' ? '#a78bfa' : '#60a5fa', fontWeight: 600, marginTop: '2px' }}>
                  {tier === 'creator_50' ? '🎬 Creator' : '🌟 Member'}
                </div>
              )}
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
