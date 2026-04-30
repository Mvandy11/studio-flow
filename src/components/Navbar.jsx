import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav
      style={{
        width: '100%',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backdropFilter: 'blur(12px)',
        background: 'rgba(14, 14, 17, 0.6)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <Link to="/" style={{ textDecoration: 'none', color: 'var(--accent-gold)', fontSize: '1.4rem' }}>
        Studio Flow
      </Link>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <Link to="/feed" style={{ color: 'var(--text-soft)' }}>Feed</Link>
        <Link to="/profile" style={{ color: 'var(--text-soft)' }}>Profile</Link>
        <Link to="/studio" style={{ color: 'var(--text-soft)' }}>Studio</Link>
        <NavLink
          to="/creator-academy"
          style={({ isActive }) => ({
            color: isActive ? 'var(--accent-gold)' : 'var(--text-soft)',
            fontWeight: isActive ? 600 : 400,
          })}
        >
          Creator Academy
        </NavLink>

        <a
          href="https://buy.stripe.com/00w7sNehf2FO4II3OBb7y01"
          target="_blank"
          rel="noopener noreferrer"
          className="subscribe-button"
        >
          Subscribe – $15/month
        </a>

        {user ? (
          <button
            onClick={logout}
            className="cinematic-button cinematic-button-danger cinematic-hover"
          >
            Log Out
          </button>
        ) : (
          <Link to="/" style={{ color: 'var(--accent-blue)' }}>Log In</Link>
        )}
      </div>
    </nav>
  );
}
