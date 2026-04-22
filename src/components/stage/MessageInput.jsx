import { useState } from 'react';

export default function MessageInput({ onSend, disabled }) {
  const [text, setText] = useState('');

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (disabled) {
    return (
      <div className="stage-input-row">
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', margin: 0 }}>
          Sign in to chat.
        </p>
      </div>
    );
  }

  return (
    <div className="stage-input-row">
      <input
        type="text"
        className="cinematic-input"
        placeholder="Say something…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ flex: 1 }}
      />
      <button className="cinematic-button-accent" onClick={handleSend}>
        Send
      </button>
    </div>
  );
}
