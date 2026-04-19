import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getSessionById } from '../lib/session';
import { useRealtimeChat } from '../hooks/useRealtimeChat';

export default function SessionPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');

  const { messages, send } = useRealtimeChat(id, user?.id);

  useEffect(() => {
    async function load() {
      const data = await getSessionById(id);
      setSession(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="cinematic-hero cinematic-fade">Loading session...</div>;
  if (!session) return <div className="cinematic-hero cinematic-fade">Session not found.</div>;

  return (
    <div className="cinematic-fade">
      <div className="cinematic-hero">
        <h1>{session.title}</h1>
        <p>{session.description}</p>
      </div>

      <div style={{ padding: '2rem' }}>
        {session.livestream_url && (
          <iframe
            src={session.livestream_url}
            width="100%"
            height="400"
            allow="autoplay; encrypted-media"
          />
        )}

        <h2>Live Chat</h2>

        <div className="cinematic-card cinematic-hover cinematic-stagger" style={{ height: '220px', overflowY: 'auto' }}>
          {messages.map((m) => (
            <div key={m.id} style={{ marginBottom: '0.5rem' }}>
              <strong>{m.sender_id}</strong>: {m.message}
            </div>
          ))}
        </div>

        {user && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
            <input
              className="cinematic-input"
              type="text"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ marginBottom: 0 }}
            />
            <button
              className="cinematic-button cinematic-button-accent cinematic-hover"
              onClick={() => { send(text); setText(''); }}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
