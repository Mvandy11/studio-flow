import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getSessionById } from '../lib/session';
import { useRealtimeChat } from '../hooks/useRealtimeChat';
import ChatBubble from '../components/ChatBubble';
import LivePlayer from '../components/LivePlayer';

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

  if (loading) return <div className="cinematic-hero">Loading session...</div>;
  if (!session) return <div className="cinematic-hero">Session not found.</div>;

  return (
    <div>
      <div className="cinematic-hero">
        <h1>{session.title}</h1>
        <p>{session.description}</p>
      </div>

      <div style={{ padding: '2rem' }}>
        {session.livestream_url && (
          <LivePlayer url={session.livestream_url} label={session.title} />
        )}

        <h2>Live Chat</h2>

        <div
          className="cinematic-card cinematic-stagger"
          style={{ height: '220px', overflowY: 'auto', padding: '1rem' }}
        >
          {messages.map((m) => (
            <ChatBubble
              key={m.id}
              message={m.content}
              isSelf={m.user_id === user?.id}
            />
          ))}
        </div>

        {user && (
          <div style={{ marginTop: '1rem' }}>
            <input
              type="text"
              className="cinematic-input"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="cinematic-button-accent"
              onClick={() => {
                send(text);
                setText('');
              }}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
