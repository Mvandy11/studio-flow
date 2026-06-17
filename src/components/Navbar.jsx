import { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMembership } from '../hooks/useMembership';
import { isCreatorAdmin } from '../lib/roles';
import MobileDrawer from './MobileDrawer';

function ProfileDropdown({ user, role, membership, tier, meta, isActive, expiresAt, onLogout }) {
  const initial = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="profile-dropdown">
      {/* Header */}
      <div className="profile-dropdown__header">
        <div className="profile-dropdown__avatar">{initial}</div>
        <div className="profile-dropdown__info">
          <div className="profile-dropdown__email">{user.email}</div>
          <span
            className="profile-dropdown__badge"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
          >
            {tier === 'enterprise' ? '✦ ' : ''}{meta.label}
            {isActive ? '' : ' · Inactive'}
          </span>
        </div>
      </div>

      <div className="profile-dropdown__divider" />

      {/* Membership info */}
      <div className="profile-dropdown__section-label">Membership</div>
      <div className="profile-dropdown__membership-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'rgba(200,200,215,0.5)' }}>Status</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isActive ? '#86efac' : 'rgba(200,200,215,0.4)' }}>
            {isActive ? '● Active' : '○ Inactive'}
          </span>
        </div>
        {expiresAt && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(200,200,215,0.5)' }}>Renews</span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(200,200,215,0.7)' }}>{expiresAt}</span>
          </div>
        )}
      </div>

      <div className="profile-dropdown__divider" />

      {/* Nav links */}
      <NavLink to="/profile"          className="profile-dropdown__item" end>◉ My Profile</NavLink>
      <NavLink to="/subscription"     className="profile-dropdown__item">🌟 My Membership</NavLink>
      <NavLink to="/earnings"         className="profile-dropdown__item">◎ Earnings</NavLink>
      <NavLink to="/settings/payouts" className="profile-dropdown__item">💳 Payout Settings</NavLink>
      {isCreatorAdmin(role) && (
        <NavLink to="/admin" className="profile-dropdown__item profile-dropdown__item--admin">🛡 Admin</NavLink>
      )}

      <div className="profile-dropdown__divider" />

      <button className="profile-dropdown__item profile-dropdown__item--logout" onClick={onLogout}>
        ⏻ Log Out
      </button>
    </div>
  );
}

export default function Navbar({ onHamburger }) {
  const { user, role, logout } = useAuth();
  const { tier, meta, isActive, expiresAt } = useMembership();
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const dropdownRef = useRef(null);

  function openDrawer() {
    setDrawerOpen(true);
    onHamburger?.();
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const initial = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      <nav className="app-topnav">
        {/* Hamburger — mobile only */}
        <button
          className="app-topnav__hamburger"
          onClick={openDrawer}
          aria-label="Open navigation"
        >
          <span className="nav-hamburger__bar" />
          <span className="nav-hamburger__bar" />
          <span className="nav-hamburger__bar" />
          <span className="app-topnav__menu-label">Menu</span>
        </button>

        {/* Mobile logo */}
        <Link
          to="/"
          className="topnav-logo-mobile"
          style={{ textDecoration: 'none', color: 'var(--accent-gold)', fontWeight: 700, fontSize: '1.05rem' }}
        >
          Studio Flow
        </Link>

        {/* Search */}
        <input
          className="app-topnav__search"
          type="search"
          placeholder="Search sessions, creators, events…"
          aria-label="Search"
        />

        {/* Right actions */}
        <div className="app-topnav__right">
          {user ? (
            <div className="profile-menu-wrap" ref={dropdownRef}>
              <button
                className="profile-menu-trigger"
                onClick={() => setProfileOpen((o) => !o)}
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
              >
                <div
                  className="profile-menu-trigger__avatar"
                  style={{ border: `2px solid ${meta.border}` }}
                >
                  {initial}
                </div>
                <span className="profile-menu-trigger__chevron" style={{ transform: profileOpen ? 'rotate(180deg)' : 'none' }}>
                  ▾
                </span>
              </button>

              {profileOpen && (
                <ProfileDropdown
                  user={user}
                  role={role}
                  tier={tier}
                  meta={meta}
                  isActive={isActive}
                  expiresAt={expiresAt}
                  onLogout={() => { logout(); setProfileOpen(false); }}
                />
              )}
            </div>
          ) : (
            <Link to="/login" className="app-topnav__login-link">Log In</Link>
          )}
        </div>
      </nav>

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
