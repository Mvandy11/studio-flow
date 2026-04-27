import type { Session } from '../mock/seed';

const STATUS_LABEL: Record<Session['status'], string> = {
  live:      '● LIVE NOW',
  published: '✓ Published',
  scheduled: '⏰ Scheduled',
  draft:     '✎ Draft',
};

const STATUS_COLOR: Record<Session['status'], string> = {
  live:      '#f87171',
  published: '#4ade80',
  scheduled: '#60a5fa',
  draft:     '#888',
};

interface CinematicPreviewProps {
  session: Partial<Session>;
}

export default function CinematicPreview({ session }: CinematicPreviewProps) {
  const status = session.status ?? 'draft';
  const color = STATUS_COLOR[status];

  return (
    <div style={{ position: 'relative' }}>
      <p className="cinematic-label" style={{ marginBottom: '0.75rem', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666' }}>
        Preview
      </p>

      <div
        className="cinematic-card"
        style={{
          overflow: 'hidden',
          background: 'rgba(8,8,14,0.9)',
          border: `1px solid ${color}33`,
          boxShadow: `0 0 30px ${color}18`,
          transition: 'box-shadow 0.4s, border-color 0.4s',
        }}
      >
        <div style={{ position: 'relative' }}>
          {session.thumbnail_url ? (
            <img
              src={session.thumbnail_url}
              alt={session.title ?? 'Preview'}
              style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '160px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '2rem', opacity: 0.2 }}>🎬</span>
            </div>
          )}

          <span
            style={{
              position: 'absolute', top: '0.65rem', right: '0.65rem',
              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
              color, background: `${color}18`,
              border: `1px solid ${color}44`,
              borderRadius: '4px', padding: '0.2rem 0.5rem',
            }}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>

        <div style={{ padding: '1rem' }}>
          <h3
            style={{
              fontSize: '1rem', fontWeight: 700,
              background: 'linear-gradient(90deg, #e0e0ff, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', margin: '0 0 0.45rem',
              minHeight: '1.3em',
            }}
          >
            {session.title || <span style={{ opacity: 0.3, WebkitTextFillColor: '#888' }}>Session title…</span>}
          </h3>

          <p style={{ fontSize: '0.8rem', color: '#777', margin: 0, lineHeight: 1.5, minHeight: '2.4em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {session.description || 'Description will appear here…'}
          </p>

          {session.scheduled_at && (
            <p style={{ fontSize: '0.72rem', color: '#60a5fa', marginTop: '0.5rem' }}>
              ⏰ {new Date(session.scheduled_at).toLocaleString()}
            </p>
          )}
        </div>

        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.5rem' }}>
          <div style={{ height: '28px', width: '80px', borderRadius: '6px', background: 'rgba(79,142,247,0.25)', border: '1px solid rgba(79,142,247,0.3)' }} />
          <div style={{ height: '28px', width: '60px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>
      </div>
    </div>
  );
}
