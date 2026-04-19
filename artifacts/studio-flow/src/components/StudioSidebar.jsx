export default function StudioSidebar({ current, onSelect }) {
  const links = [
    { key: 'overview', label: 'Overview' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'posts', label: 'Posts' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <aside
      style={{
        width: '240px',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        padding: '5rem 1rem 2rem',
        background: 'rgba(14,14,17,0.6)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        zIndex: 900,
      }}
    >
      {links.map(({ key, label }) => (
        <button
          key={key}
          className={`cinematic-sidebar-link${current === key ? ' active' : ''}`}
          onClick={() => onSelect(key)}
        >
          {label}
        </button>
      ))}
    </aside>
  );
}
