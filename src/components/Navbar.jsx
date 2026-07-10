import { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMembership } from '../hooks/useMembership';
import { isCreatorAdmin } from '../lib/roles';
import { supabase } from '../lib/supabase';
import MobileDrawer from './MobileDrawer';

function ProfileDropdown({ user, role, tier, meta, onLogout }) {
  const initial = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="profile-dropdown">
      <div className="profile-dropdown__header">
        <div className="profile-dropdown__avatar">{initial}</div>
        <div className="profile-dropdown__info">
          <div className="profile-dropdown__email">{user.email}</div>
        </div>
      </div>

      <div className="profile-dropdown__divider" />

      <NavLink to="/profile"          className="profile-dropdown__item" end>◉ My Profile</NavLink>
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
  const { role, logout } = useAuth();
  const { tier, meta } = useMembership();
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const dropdownRef = useRef(null);

  // ── Independent session check — avoids flashing "Log In" while
  //    the shared AuthContext is still resolving from localStorage.
  //    undefined = still checking | null = no session | object = logged in
  const [sessionUser, setSessionUser] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  function openDrawer() {
    setDrawerOpen(true);
    onHamburger?.();
  }

  useEffect(() => {
    function handleOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const initial = sessionUser?.email?.[0]?.toUpperCase() ?? '?';

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
          placeholder="Search sessions, creators, videos…"
          aria-label="Search"
        />

        {/* Right actions — renders nothing while session is being checked (undefined),
            then shows avatar or Log In once resolved */}
        <div className="app-topnav__right">
          {sessionUser === undefined ? null : sessionUser ? (
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
                  user={sessionUser}
                  role={role}
                  tier={tier}
                  meta={meta}
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
