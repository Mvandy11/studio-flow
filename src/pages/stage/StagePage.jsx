import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useRealtimeChat } from '../../hooks/useRealtimeChat';
import ChatBubble from '../../components/ChatBubble';

export default function StagePage() {
  const { stageRoomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { messages, send } = useRealtimeChat(stageRoomId, user?.id);
  const [text, setText] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    send(trimmed);
    setText('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="cinematic-hero" style={{ paddingBottom: '1.5rem' }}>
        <h1 className="cinematic-title">Live Stage</h1>
        <p className="cinematic-subtitle" style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
          Room: {stageRoomId}
        </p>
        <button
          className="cinematic-button"
          style={{ marginTop: '0.75rem' }}
          onClick={() => navigate(-1)}
        >
          ← Leave Stage
        </button>
      </div>

      <div style={{ flex: 1, padding: '0 2rem 2rem' }}>
        <div className="cinematic-section">
          <h2 className="cinematic-label" style={{ marginBottom: '0.75rem' }}>
            Live Chat
          </h2>

          <div
            className="cinematic-card cinematic-stagger"
            style={{
              height: '320px',
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {messages.length === 0 && (
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                No messages yet. Say hello!
              </p>
            )}
            {messages.map((m) => (
              <ChatBubble
                key={m.id}
                message={m.message}
                isSelf={m.sender_id === user?.id}
              />
            ))}
            <div ref={chatEndRef} />
          </div>

          {user ? (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <input
                type="text"
                className="cinematic-input"
                placeholder="Type a message…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ flex: 1 }}
              />
              <button className="cinematic-button-accent" onClick={handleSend}>
                Send
              </button>
            </div>
          ) : (
            <p style={{ marginTop: '1rem', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
              Sign in to chat.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
