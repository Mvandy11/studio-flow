import { useEffect, useRef } from 'react';

export default function MessageList({ messages, pinnedMessage, currentUserId, creatorId, isCreator, onPin }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="stage-message-list">
      {pinnedMessage && (
        <div className="stage-pinned-message">
          <span style={{ marginRight: '0.4rem' }}>📌</span>
          {pinnedMessage.message ?? pinnedMessage}
        </div>
      )}

      {messages.length === 0 && (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
          No messages yet — say hello!
        </p>
      )}

      {messages.map((m) => {
        const isSelf = m.sender_id === currentUserId;
        const isFromCreator = m.sender_id === creatorId;

        return (
          <div
            key={m.id}
            className={[
              'stage-message',
              isSelf ? 'stage-message--self' : '',
              isFromCreator ? 'stage-message--creator' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', flexWrap: 'wrap' }}>
              {isFromCreator && (
                <span className="stage-creator-badge">Creator</span>
              )}
              <span className="stage-message-text">{m.message}</span>
            </div>

            {isCreator && !isSelf && (
              <button
                className="stage-pin-btn"
                title="Pin this message"
                onClick={() => onPin(m)}
              >
                📌
              </button>
            )}
          </div>
        );
      })}

      <div ref={endRef} />
    </div>
  );
}
