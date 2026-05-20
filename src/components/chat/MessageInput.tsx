import { useRef, useState } from 'react';
import type { ChatMessage } from '../../lib/types';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '../../lib/isAdmin';

interface MessageInputProps {
  onSend:           (content: string, isAnnouncement: boolean) => void;
  onTyping:         () => void;
  replyingTo:       ChatMessage | null;
  onCancelReply:    () => void;
  disabled?:        boolean;
  placeholder?:     string;
}

export default function MessageInput({
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
  disabled = false,
  placeholder = 'Send a message…',
}: MessageInputProps) {
  const { user, role } = useAuth();
  const [text,         setText]         = useState('');
  const [isAnnounce,   setIsAnnounce]   = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const admin = isAdminRole(role);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    onTyping();
    // Auto-resize
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, isAnnounce);
    setText('');
    setIsAnnounce(false);
    const ta = textareaRef.current;
    if (ta) ta.style.height = 'auto';
  }

  if (!user) {
    return (
      <div className="chat-input-area" style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted, #666)' }}>
        <a href="/login" style={{ color: '#6ea8ff' }}>Log in</a> to send messages.
      </div>
    );
  }

  return (
    <div className="chat-input-area">
      {/* Reply bar */}
      {replyingTo && (
        <div className="chat-reply-bar">
          <span>↩ Replying to</span>
          <span className="chat-reply-bar__text">{replyingTo.content}</span>
          <button className="chat-reply-bar__close" onClick={onCancelReply} title="Cancel reply">✕</button>
        </div>
      )}

      {/* Announcement mode toggle (admin only) */}
      {admin && (
        <label className={`chat-announce-toggle${isAnnounce ? ' chat-announce-toggle--on' : ''}`}>
          <input
            type="checkbox"
            checked={isAnnounce}
            onChange={(e) => setIsAnnounce(e.target.checked)}
          />
          📢 Announcement mode
        </label>
      )}

      <div className="chat-input-row">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={replyingTo ? 'Write a reply…' : placeholder}
          rows={1}
          disabled={disabled}
          style={{ minHeight: 38 }}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
        >
          {replyingTo ? 'Reply' : 'Send'}
        </button>
      </div>
    </div>
  );
}
