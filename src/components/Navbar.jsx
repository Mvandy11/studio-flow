import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MobileDrawer from './MobileDrawer';

export default function Navbar({ onHamburger }) {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function openDrawer() {
    setDrawerOpen(true);
    onHamburger?.();
  }

  return (
    <>
      <nav className="app-topnav">
        {/* Hamburger — visible on mobile only (CSS hides on desktop) */}
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

        {/* Mobile logo — only shows when sidebar is hidden */}
        <Link
          to="/"
          className="topnav-logo-mobile"
          style={{ textDecoration:'none', color:'var(--accent-gold)', fontWeight:700, fontSize:'1.05rem' }}
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
          <a
            href="https://buy.stripe.com/00w7sNehf2FO4II3OBb7y01"
            target="_blank"
            rel="noopener noreferrer"
            className="app-topnav__subscribe"
          >
            Subscribe $15/mo
          </a>

          {user ? (
            <button
              onClick={logout}
              className="cinematic-button cinematic-button-danger"
              style={{ padding:'0.38rem 0.9rem', fontSize:'0.82rem' }}
            >
              Log Out
            </button>
          ) : (
            <Link to="/" style={{ color:'var(--accent-blue)', fontSize:'0.875rem' }}>Log In</Link>
          )}
        </div>
      </nav>

      {/* Mobile drawer (only opens from hamburger on mobile) */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
