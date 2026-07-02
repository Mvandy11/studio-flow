import { useAuth } from '../hooks/useAuth';

export default function StudioTopbar() {
  const { user } = useAuth();

  return (
    <header
      style={{
        width: '100%',
        padding: '1rem 2rem',
        background: 'rgba(14,14,17,0.45)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      <h2 style={{ margin: 0, color: 'var(--accent-blue)' }}>
        Studio
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ opacity: 0.8 }}>
          {user?.email || 'Creator'}
        </span>
        <div
          className="avatar-fallback"
          style={{
            width: '40px',
            height: '40px',
            backgroundSize: 'cover',
          }}
        />
      </div>
    </header>
  );
}
