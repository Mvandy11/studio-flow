import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { replyToMessage, useThread } from '../../modules/chat/threads';
import type { ChatMessage } from '../../lib/types';
import MessageInput from './MessageInput';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

interface ThreadViewProps {
  parentMessage: ChatMessage;
  channelId:     string;
  onClose:       () => void;
}

export default function ThreadView({ parentMessage, channelId, onClose }: ThreadViewProps) {
  const { user } = useAuth();
  const { replies, loading } = useThread(parentMessage.id);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  async function handleSend(content: string) {
    if (!user?.id || sending) return;
    setSending(true);
    try {
      await replyToMessage(parentMessage.id, channelId, user.id, content);
    } catch {
      // handled by the UI
    } finally {
      setSending(false);
    }
  }

  const displayName = (msg: ChatMessage) =>
    msg.display_name || msg.user_id.slice(0, 8);

  return (
    <div className="chat-thread-view">
      {/* Header */}
      <div className="chat-thread-view__header">
        <span>Thread</span>
        <button className="chat-thread-view__close" onClick={onClose} aria-label="Close thread">✕</button>
      </div>

      {/* Parent message */}
      <div className="chat-thread-view__parent">
        <div className="chat-thread-view__parent-label">Original message</div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          {displayName(parentMessage)}
          <span style={{ marginLeft: '0.5rem', fontWeight: 400, fontSize: '0.7rem', color: 'var(--text-muted, #555)' }}>
            {formatTime(parentMessage.created_at)}
          </span>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, wordBreak: 'break-word' }}>
          {parentMessage.content}
        </div>
      </div>

      {/* Replies */}
      <div className="chat-thread-view__replies">
        {loading && (
          <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted, #666)' }}>
            Loading replies…
          </div>
        )}

        {!loading && replies.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted, #666)' }}>
            No replies yet.
          </div>
        )}

        {replies.map((reply) => {
          const isSelf = reply.user_id === user?.id;
          return (
            <div key={reply.id} style={{ display: 'flex', gap: '0.4rem', padding: '0.3rem 0' }}>
              <div
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: isSelf ? 'rgba(79,142,247,0.2)' : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                  color: isSelf ? '#6ea8ff' : '#999',
                }}
              >
                {reply.user_id.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.1rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{displayName(reply)}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #555)' }}>
                    {formatTime(reply.created_at)}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.45, wordBreak: 'break-word' }}>
                  {reply.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Reply input */}
      <MessageInput
        onSend={handleSend}
        onTyping={() => {}}
        replyingTo={null}
        onCancelReply={() => {}}
        disabled={sending}
        placeholder="Reply in thread…"
      />
    </div>
  );
}
