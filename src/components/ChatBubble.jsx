import { useState } from 'react';

export default function ChatBubble({ message, isSelf }) {
  const [reaction, setReaction] = useState(null);

  const reactions = ['🔥', '❤️', '👁️'];

  return (
    <div
      className="cinematic-fade"
      style={{
        display: 'flex',
        justifyContent: isSelf ? 'flex-end' : 'flex-start',
        marginBottom: '0.6rem',
        position: 'relative',
      }}
    >
      <div
        className="cinematic-card"
        style={{
          maxWidth: '70%',
          padding: '0.8rem 1rem',
          background: isSelf
            ? 'rgba(110, 168, 255, 0.15)'
            : 'rgba(255, 255, 255, 0.05)',
          borderColor: isSelf
            ? 'rgba(110, 168, 255, 0.35)'
            : 'rgba(255, 255, 255, 0.06)',
          cursor: 'pointer',
        }}
        onClick={() => setReaction(reaction ? null : 'open')}
      >
        {message}

        {reaction && reaction !== 'open' && (
          <div
            className="cinematic-glow"
            style={{
              marginTop: '0.4rem',
              fontSize: '1.2rem',
              opacity: 0.9,
            }}
          >
            {reaction}
          </div>
        )}
      </div>

      {reaction === 'open' && (
        <div
          className="cinematic-card cinematic-hover"
          style={{
            position: 'absolute',
            bottom: '-2.5rem',
            right: isSelf ? '0' : 'auto',
            left: isSelf ? 'auto' : '0',
            display: 'flex',
            gap: '0.5rem',
            padding: '0.4rem 0.6rem',
            borderRadius: '8px',
            zIndex: 10,
          }}
        >
          {reactions.map((r) => (
            <span
              key={r}
              style={{
                cursor: 'pointer',
                fontSize: '1.2rem',
              }}
              onClick={() => setReaction(r)}
            >
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
