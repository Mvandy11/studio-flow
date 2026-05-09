import { Link } from 'react-router-dom';

export default function ContestsTab() {
  return (
    <div className="hub-content">
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🏆</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--hub-text)', margin: '0 0 0.75rem' }}>
          Contests
        </h2>
        <p style={{ color: 'var(--hub-muted)', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
          All active and upcoming contests are listed on the Contests page. Submit your work, like your favorites, and win prizes.
        </p>
        <Link
          to="/contests"
          style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            borderRadius: '12px',
            background: 'var(--hub-gold)',
            color: '#0d0d14',
            fontWeight: 700,
            fontSize: '0.95rem',
            textDecoration: 'none',
          }}
        >
          Browse All Contests →
        </Link>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          marginTop: '2.5rem',
        }}>
          {[
            { icon: '✏', label: 'Free Entry',      detail: 'Open to all members' },
            { icon: '❤', label: 'Community Voting', detail: 'Like your favorites' },
            { icon: '🏆', label: 'Prize Pool',      detail: 'Admin-determined' },
            { icon: '🛡', label: 'Admin Selects',   detail: 'Based on quality' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: 'var(--hub-card)',
                border: '1px solid var(--hub-border)',
                borderRadius: '10px',
                padding: '0.875rem',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>{item.icon}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--hub-text)', marginBottom: '0.2rem' }}>{item.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--hub-muted)' }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
