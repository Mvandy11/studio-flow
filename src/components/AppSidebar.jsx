import { NavLink, Link } from 'react-router-dom';
import { Megaphone, Clapperboard, Film, UserCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';
import { useProfile } from '../hooks/useProfile';


export default function AppSidebar({ open, onClose }) {
  const { user, role, logout } = useAuth();
  const { profile } = useProfile();

  const initial = user?.email?.[0]?.toUpperCase() ?? '?';

  const isAdmin = isCreatorAdmin(role);

  // ⭐ Correct membership logic (new system)
  const isCreator50 =
    isAdmin ||
    (profile?.membership_active && profile?.membership_tier === 'premier');

  const isMember30 =
    !isCreator50 &&
    profile?.membership_active &&
    profile?.membership_tier === 'founding';

  const isFree = !isCreator50 && !isMember30;

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
          <NavItem to="/studio" icon="⬡" label="Studio" />
        </nav>

        <div className="app-sidebar__divider" />

        {/* ── AI Tools ── */}
        <div className="app-sidebar__section-label">AI Tools</div>
        <nav className="app-sidebar__nav">
          <NavItem to="/tools/denoise" icon="♫" label="Denoise" />
          <NavItem to="/create-identity" icon={<UserCircle size={16} />} label="Create Identity" />
          <NavItem to="/my-videos" icon={<Film size={16} />} label="My Videos" />
        </nav>

        <div className="app-sidebar__divider" />

        {/* ── Platform ── */}
        <div className="app-sidebar__section-label">Platform</div>
        <nav className="app-sidebar__nav">
          <NavItem to="/contests"        icon="🏆" label="Contests" />
          <NavItem to="/announcements"   icon={<Megaphone size={16} />} label="Announcements" />
          <NavItem to="/free-chat"       icon="🗣" label="Free Chat" />
          <NavItem to="/generator" icon={<Clapperboard size={16} />} label="Video Generator" />
        </nav>

        <div className="app-sidebar__divider" />

        {/* ── Account — NEW membership logic ── */}
        <div className="app-sidebar__section-label">Account</div>
        <nav className="app-sidebar__nav">

          {/* Free */}
          {isFree && (
            <NavItem to="/membership" icon="⭐" label="Membership" />
          )}

          {/* Member */}
          {isMember30 && (
            <>
              <NavItem to="/membership"          icon="🌟" label="Dashboard" />
              <NavItem to="/contests/my-entries" icon="🏆" label="Contest Entries" />
            </>
          )}

          {/* Creator */}
          {isCreator50 && (
            <NavItem to="/contests/my-entries" icon="🏆" label="Contest Entries" />
          )}

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
              <AdminItem to="/admin/winners"      icon="🏆" label="Winners" />
              <AdminItem to="/admin/analytics"    icon="📊" label="Analytics" />
              <AdminItem to="/admin/errors"       icon="🔴" label="Error Logs" />
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

              {isAdmin ? (
                <div style={{ fontSize: '0.68rem', color: '#f2c98f', fontWeight: 600, marginTop: '2px' }}>
                  🛡 Admin
                </div>
              ) : profile?.membership_active && profile?.membership_tier === 'premier' ? (
                <div style={{ fontSize: '0.68rem', color: '#a78bfa', fontWeight: 600, marginTop: '2px' }}>
                  🎬 Premier Member
                </div>
              ) : profile?.membership_active && profile?.membership_tier === 'founding' ? (
                <div style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 600, marginTop: '2px' }}>
                  🌟 Founding Member
                </div>
              ) : (
                <div style={{ fontSize: '0.68rem', color: '#999', fontWeight: 600, marginTop: '2px' }}>
                  Free Member
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
