import '../../src/styles/dev.css';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../hooks/useSessions';
import ChatPanel from '../components/ChatPanel';

export default function DevChat() {
  const { sessionId = 'session-1' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading } = useSession(sessionId);

  return (
    <div className="cinematic-layout cinematic-fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button className="cinematic-button" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/dev')}>
          ← Dashboard
        </button>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fabc50', background: 'rgba(250,188,80,0.12)', border: '1px solid rgba(250,188,80,0.3)', borderRadius: '4px', padding: '0.2rem 0.55rem' }}>
          🛠 Dev Mode
        </span>

        {session && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {session.thumbnail_url && (
              <img
                src={session.thumbnail_url}
                alt=""
                style={{ width: '32px', height: '22px', objectFit: 'cover', borderRadius: '4px' }}
              />
            )}
            <h2 className="cinematic-title" style={{ fontSize: '1.1rem', margin: 0 }}>
              {session.title}
            </h2>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="cinematic-spinner" />
        </div>
      ) : (
        <div
          className="cinematic-card"
          style={{ overflow: 'hidden', height: '520px', display: 'flex', flexDirection: 'column' }}
        >
          <ChatPanel sessionId={sessionId} />
        </div>
      )}

      <div
        className="cinematic-card"
        style={{ marginTop: '1rem', padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#555', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}
      >
        <span>💬 Chat is backed by in-memory mock — refreshes every 2s</span>
        <span>🛠 No real Supabase. Mock user: <strong style={{ color: '#a78bfa' }}>Dev User</strong></span>
      </div>
    </div>
  );
}
