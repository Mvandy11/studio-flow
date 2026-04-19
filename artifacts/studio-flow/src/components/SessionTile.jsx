import { Link } from 'react-router-dom';

export default function SessionTile({ session }) {
  return (
    <div className="cinematic-card cinematic-hover cinematic-fade" style={{ padding: '1rem' }}>
      {session.thumbnail_url && (
        <img
          src={session.thumbnail_url}
          alt="session thumbnail"
          className="cinematic-thumbnail"
          style={{ width: '100%', borderRadius: '8px', marginBottom: '0.5rem' }}
        />
      )}

      <h3>{session.title}</h3>
      <p>{new Date(session.start_time).toLocaleString()}</p>

      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
        <Link to={`/studio/session/${session.id}/edit`} className="cinematic-button">
          Edit
        </Link>
        <Link to={`/session/${session.id}`} className="cinematic-button-accent">
          Open
        </Link>
      </div>
    </div>
  );
}
