import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getSessionsForCreator } from '../lib/session';
import CreateSessionModal from '../components/CreateSessionModal';
import SessionTile from '../components/SessionTile';

export default function StudioSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const data = await getSessionsForCreator(user.id);
      setSessions(data);
      setLoading(false);
    }
    load();
  }, [user]);

  function handleCreated(newSession) {
    setSessions((prev) => [...prev, newSession]);
  }

  return (
    <div className="cinematic-layout">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="cinematic-title" style={{ margin: 0 }}>Your Sessions</h1>
        <button
          className="cinematic-button cinematic-hover"
          onClick={() => setModalOpen(true)}
        >
          + Create Session
        </button>
      </div>

      {loading && <p style={{ opacity: 0.6 }}>Loading sessions...</p>}

      {!loading && sessions.length === 0 && (
        <div className="cinematic-card cinematic-fade" style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
          No sessions yet. Create your first one!
        </div>
      )}

      <div
        className="cinematic-stagger"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}
      >
        {sessions.map((session) => (
          <SessionTile
            key={session.id}
            id={session.id}
            title={session.title}
            description={session.description}
            thumbnail={session.thumbnail_url || undefined}
            start_time={session.start_time}
          />
        ))}
      </div>

      <CreateSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
