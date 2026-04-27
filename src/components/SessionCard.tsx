import type { Session } from '../mock/seed';

const STATUS_CONFIG = {
  live:      { label: '● LIVE',      color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  published: { label: 'Published',   color: '#4ade80', bg: 'rgba(74,222,128,0.10)' },
  scheduled: { label: 'Scheduled',   color: '#60a5fa', bg: 'rgba(96,165,250,0.10)' },
  draft:     { label: 'Draft',       color: '#888',    bg: 'rgba(255,255,255,0.06)' },
} as const;

interface SessionCardProps {
  session: Session;
  onClick?: () => void;
  onEdit?: () => void;
}

export default function SessionCard({ session, onClick, onEdit }: SessionCardProps) {
  const cfg = STATUS_CONFIG[session.status];

  return (
    <div
      className="cinematic-card cinematic-hover"
      style={{ overflow: 'hidden', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {session.thumbnail_url && (
        <img
          src={session.thumbnail_url}
          alt={session.title}
          style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
        />
      )}

      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e0e0ff', margin: 0, lineHeight: 1.3 }}>
            {session.title}
          </h3>
          <span
            style={{
              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
              color: cfg.color, background: cfg.bg,
              border: `1px solid ${cfg.color}33`,
              borderRadius: '4px', padding: '0.15rem 0.45rem', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {cfg.label}
          </span>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 0.75rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {session.description}
        </p>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {onEdit && (
            <button
              className="cinematic-button"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              Edit
            </button>
          )}
          {onClick && (
            <button
              className="cinematic-button-accent"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
              onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
              {session.status === 'live' ? 'Join Live' : 'Open'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
