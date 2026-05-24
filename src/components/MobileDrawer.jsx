import { useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';
import { useMembership } from '../modules/memberships/useMembership';

const DONATION_URL = 'https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t';

export default function MobileDrawer({ open, onClose }) {
  const { user, role, logout } = useAuth();
  const { tier }               = useMembership();

  const isAdmin     = isCreatorAdmin(role);
  const isCreator50 = isAdmin || tier === 'creator_50';
  const isMember30  = !isCreator50 && tier === 'member_30';
  const isFree      = !isCreator50 && !isMember30;

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function Item({ to, icon, label, end }) {
    return (
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) => `mob-drawer__link${isActive ? ' mob-drawer__link--active' : ''}`}
        onClick={onClose}
      >
        <span className="mob-drawer__link-icon">{icon}</span>
        {label}
      </NavLink>
    );
  }

  function AdminItem({ to, icon, label }) {
    return (
      <NavLink
        to={to}
        className={({ isActive }) => `mob-drawer__link${isActive ? ' mob-drawer__link--active' : ''}`}
        onClick={onClose}
        style={{ color: 'var(--accent-gold)' }}
      >
        <span className="mob-drawer__link-icon">{icon}</span>
        {label}
      </NavLink>
    );
  }

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
          <Link to="/" className="mob-drawer__logo" onClick={onClose}>Studio Flow</Link>
          <button className="mob-drawer__close" onClick={onClose} aria-label="Close menu">✕</button>
        </div>

        <nav className="mob-drawer__nav">
          {/* ── Core (all tiers) ── */}
          <Item to="/"       icon="⌂" label="Home" end />
          <Item to="/feed"   icon="◈" label="Feed" />
          <Item to="/events" icon="🎬" label="Events" />
          <Item to="/studio" icon="⬡" label="Studio" />

          {/* ── AI Tools ── */}
          <Item to="/tools/denoise" icon="♫" label="AI Denoise" />
          <Item to="/tools/upscale" icon="⤢" label="AI Upscale" />
          <Item to="/tools/enhance" icon="✦" label="AI Enhance" />

          {/* ── Platform ── */}
          <Item to="/contests"        icon="🏆" label="Contests" />
          <Item to="/announcements"   icon="📢" label="Announcements" />
          <Item to="/free-chat"       icon="💬" label="Free Chat" />
          <Item to="/creator-academy" icon="🎓" label="Academy" />

          {/* ── Free tier ── */}
          {isFree && (
            <Item to="/membership" icon="⭐" label="Membership" />
          )}

          {/* ── Member tier ── */}
          {isMember30 && <>
            <Item to="/membership"          icon="🌟" label="Dashboard" />
            <Item to="/contests/my-entries" icon="🏆" label="Contest Entries" />
          </>}

          {/* ── Creator tier ── */}
          {isCreator50 && <>
            <Item to="/creator/dashboard"   icon="🎬" label="Creator Dashboard" />
            <Item to="/creator/new-event"   icon="➕" label="Create Event" />
            <Item to="/creator/events"      icon="📋" label="My Events" />
            <Item to="/creator/donations"   icon="💛" label="Donations" />
            <Item to="/creator/revenue"     icon="📈" label="Revenue Pool" />
            <Item to="/contests/my-entries" icon="🏆" label="Contest Entries" />
          </>}

          {/* ── Account (all tiers) ── */}
          <Item to="/earnings" icon="◎" label="Earnings" />
          <Item to="/profile"  icon="◉" label="Profile" />

          {/* ── Admin ── */}
          {isCreatorAdmin(role) && <>
            <AdminItem to="/admin"              icon="🛡" label="Admin" />
            <AdminItem to="/creator/new-event"  icon="🎬" label="Post Event" />
            <AdminItem to="/admin/winners"      icon="🏆" label="Winners" />
            <AdminItem to="/admin/analytics"    icon="📊" label="Analytics" />
            <AdminItem to="/admin/errors"       icon="🔴" label="Error Logs" />
          </>}
        </nav>

        <div className="mob-drawer__divider" />

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
