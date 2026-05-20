import { useEffect, useRef, useState } from 'react';
import { useChat, useSendMessage } from '../hooks/useChat';
import { DEV_USER, creators } from '../mock/seed';

function senderName(id: string): string {
  if (id === DEV_USER.id) return 'You';
  return creators.find((c) => c.id === id)?.name ?? 'Guest';
}

interface ChatPanelProps {
  sessionId: string;
}

export default function ChatPanel({ sessionId }: ChatPanelProps) {
  const { data: messages = [], isLoading } = useChat(sessionId);
  const { mutate: sendMsg } = useSendMessage();
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate typing indicator
  useEffect(() => {
    const t1 = setTimeout(() => setIsTyping(true), 3000);
    const t2 = setTimeout(() => setIsTyping(false), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages.length]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMsg({ session_id: sessionId, content: trimmed, user_id: DEV_USER.id });
    setText('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '340px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="cinematic-label" style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Live Chat
        </span>
        <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 700 }}>● LIVE</span>
      </div>

      <div
        style={{
          flex: 1, overflowY: 'auto', padding: '0.75rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}
      >
        {isLoading && (
          <p style={{ color: '#666', fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>Loading chat…</p>
        )}

        {messages.map((m) => {
          const isSelf = m.user_id === DEV_USER.id;
          return (
            <div
              key={m.id}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isSelf ? 'flex-end' : 'flex-start',
                gap: '0.15rem',
              }}
            >
              <span style={{
                fontSize: '0.68rem', color: '#666',
                paddingLeft: isSelf ? 0 : '0.25rem',
                paddingRight: isSelf ? '0.25rem' : 0,
              }}>
                {senderName(m.user_id)}
              </span>
              <div
                style={{
                  maxWidth: '80%', padding: '0.5rem 0.75rem',
                  background: isSelf ? 'rgba(79,142,247,0.14)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isSelf ? 'rgba(79,142,247,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '10px', fontSize: '0.83rem', color: '#d0d0e8', lineHeight: 1.45,
                }}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#666' }}>Someone is typing</span>
            <span style={{ display: 'flex', gap: '3px' }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: '#666', display: 'inline-block',
                    animation: `typingDot 1.2s ${i * 0.2}s ease-in-out infinite`,
                  }}
                />
              ))}
            </span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div style={{ padding: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          className="cinematic-input"
          placeholder="Say something…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1, fontSize: '0.83rem', padding: '0.45rem 0.75rem' }}
        />
        <button
          className="cinematic-button-accent"
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}
