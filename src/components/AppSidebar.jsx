import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';
import { useMembership } from '../modules/memberships/useMembership';

const DONATION_URL = 'https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t';

export default function AppSidebar({ open, onClose }) {
  const { user, role, logout } = useAuth();
  const { tier }               = useMembership();
  const initial                = user?.email?.[0]?.toUpperCase() ?? '?';

  const isAdmin     = isCreatorAdmin(role);
  const isCreator50 = isAdmin || tier === 'creator_50';
  const isMember30  = !isCreator50 && tier === 'member_30';
  const isFree      = !isCreator50 && !isMember30;

  function NavItem({ to, icon, label, end }) {
    return (
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) => `app-sidebar__link${isActive ? ' active' : ''}`}
        onClick={onClose}
      >
        <span className="app-sidebar__link-icon">{icon}</span>
        {label}
      </NavLink>
    );
  }

  function AdminItem({ to, icon, label }) {
    return (
      <NavLink
        to={to}
        className={({ isActive }) => `app-sidebar__link app-sidebar__admin-link${isActive ? ' active' : ''}`}
        onClick={onClose}
      >
        <span className="app-sidebar__link-icon">{icon}</span>
        {label}
      </NavLink>
    );
  }

  return (
    <>
      <div
        className={`app-sidebar-backdrop${open ? ' app-sidebar-backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`app-sidebar${open ? ' app-sidebar--open' : ''}`}>
        <Link to="/" className="app-sidebar__logo" onClick={onClose}>
          <div className="app-sidebar__logo-mark">S</div>
          <span className="app-sidebar__logo-text">Studio Flow</span>
        </Link>

        <div className="app-sidebar__divider" />

        {/* ── Core ── */}
        <nav className="app-sidebar__nav">
          <NavItem to="/"       icon="⌂" label="Home"   end />
          <NavItem to="/feed"   icon="◈" label="Feed" />
          <NavItem to="/events" icon="🎬" label="Events" />
          <NavItem to="/studio" icon="⬡" label="Studio" />
        </nav>

        <div className="app-sidebar__divider" />

        {/* ── AI Tools ── */}
        <div className="app-sidebar__section-label">AI Tools</div>
        <nav className="app-sidebar__nav">
          <NavItem to="/tools/denoise" icon="♫" label="Denoise" />
          <NavItem to="/tools/upscale" icon="⤢" label="Upscale" />
          <NavItem to="/tools/enhance" icon="✦" label="Enhance" />
        </nav>

        <div className="app-sidebar__divider" />

        {/* ── Platform ── */}
        <div className="app-sidebar__section-label">Platform</div>
        <nav className="app-sidebar__nav">
          <NavItem to="/contests"        icon="🏆" label="Contests" />
          <NavItem to="/announcements"   icon="📢" label="Announcements" />
          <NavItem to="/free-chat"       icon="💬" label="Free Chat" />
          <NavItem to="/creator-academy" icon="🎓" label="Academy" />
        </nav>

        <div className="app-sidebar__divider" />

        {/* ── Account — tier-aware ── */}
        <div className="app-sidebar__section-label">Account</div>
        <nav className="app-sidebar__nav">

          {/* Free: Membership upgrade prompt */}
          {isFree && (
            <NavItem to="/membership"   icon="⭐" label="Membership" />
          )}

          {/* Member: Membership dashboard + Contest Entries */}
          {isMember30 && <>
            <NavItem to="/membership"          icon="🌟" label="Dashboard" />
            <NavItem to="/contests/my-entries" icon="🏆" label="Contest Entries" />
          </>}

          {/* Creator: Full creator suite */}
          {isCreator50 && <>
            <NavItem to="/creator/dashboard"   icon="🎬" label="Creator Dashboard" />
            <NavItem to="/creator/new-event"   icon="➕" label="Create Event" />
            <NavItem to="/creator/events"      icon="📋" label="My Events" />
            <NavItem to="/creator/donations"   icon="💛" label="Donations" />
            <NavItem to="/creator/revenue"     icon="📈" label="Revenue Pool" />
            <NavItem to="/contests/my-entries" icon="🏆" label="Contest Entries" />
          </>}

          <NavItem to="/earnings" icon="◎"  label="Earnings" />
          <NavItem to="/profile"  icon="◉"  label="Profile" />
        </nav>

        <div className="app-sidebar__divider" />

        {/* ── Admin ── */}
        {isCreatorAdmin(role) && (
          <>
            <nav className="app-sidebar__nav">
              <NavLink
                to="/admin"
                className={({ isActive }) => `app-sidebar__link app-sidebar__admin-link${isActive ? ' active' : ''}`}
                onClick={onClose}
              >
                <span className="app-sidebar__link-icon">🛡</span>
                Admin
                <span className="app-sidebar__badge">Admin</span>
              </NavLink>
              <AdminItem to="/creator/new-event"  icon="🎬" label="Post Event" />
              <AdminItem to="/admin/winners"      icon="🏆" label="Winners" />
              <AdminItem to="/admin/analytics"    icon="📊" label="Analytics" />
              <AdminItem to="/admin/errors"       icon="🔴" label="Error Logs" />
            </nav>
            <div className="app-sidebar__divider" />
          </>
        )}

        <div className="app-sidebar__spacer" />

        {/* Donate */}
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
              {isCreator50 && <div style={{ fontSize: '0.68rem', color: '#a78bfa', fontWeight: 600, marginTop: '2px' }}>🎬 Creator</div>}
              {isMember30  && <div style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 600, marginTop: '2px' }}>🌟 Member</div>}
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
