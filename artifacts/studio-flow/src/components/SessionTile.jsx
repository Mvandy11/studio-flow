import { Link } from 'react-router-dom';

function getStatusBadge(start_time) {
  if (!start_time) return { label: 'Unscheduled', color: 'rgba(255,255,255,0.2)' };
  const now = new Date();
  const start = new Date(start_time);
  const diffMs = start - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffMs < 0) return { label: 'Ended', color: 'rgba(196,122,122,0.4)' };
  if (diffHours < 1) return { label: 'Live Soon', color: 'rgba(242,201,143,0.4)' };
  return { label: 'Upcoming', color: 'rgba(110,168,255,0.3)' };
}

export default function SessionTile({ id, title, description, thumbnail, start_time }) {
  const badge = getStatusBadge(start_time);

  return (
    <div className="cinematic-card cinematic-hover cinematic-fade" style={{ padding: 0 }}>
      <div
        className="session-fallback cinematic-thumbnail"
        style={{
          backgroundImage: thumbnail
            ? `url(${thumbnail})`
            : `url('/src/assets/art/session-fallback.png')`,
          aspectRatio: 'unset',
          borderRadius: 'var(--card-radius) var(--card-radius) 0 0',
        }}
      />

      <div style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
          <h3 style={{ margin: 0, flex: 1 }}>{title}</h3>
          <span
            style={{
              fontSize: '0.72rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
              background: badge.color,
              whiteSpace: 'nowrap',
              marginLeft: '0.75rem',
            }}
          >
            {badge.label}
          </span>
        </div>

        {start_time && (
          <p style={{ opacity: 0.5, fontSize: '0.8rem', margin: '0 0 0.4rem' }}>
            {new Date(start_time).toLocaleString()}
          </p>
        )}

        {description && (
          <p style={{ opacity: 0.7, margin: '0 0 1rem', fontSize: '0.9rem' }}>{description}</p>
        )}

        {id && (
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <Link
              to={`/studio/session/${id}/edit`}
              className="cinematic-button cinematic-hover"
              style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
            >
              Edit
            </Link>
            <Link
              to={`/session/${id}`}
              className="cinematic-button cinematic-button-accent cinematic-hover"
              style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
            >
              Open
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
