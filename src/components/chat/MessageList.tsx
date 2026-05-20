import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../lib/types';
import MessageRow from './MessageRow';

interface MessageListProps {
  messages:         ChatMessage[];
  loading:          boolean;
  currentUserId:    string | undefined;
  onlineUserIds:    Set<string>;
  onReply:          (msg: ChatMessage) => void;
  onOpenThread:     (msg: ChatMessage) => void;
}

export default function MessageList({
  messages,
  loading,
  currentUserId,
  onlineUserIds,
  onReply,
  onOpenThread,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="chat-message-list">
        <div className="chat-empty">
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #4f8ef7', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="chat-message-list">
        <div className="chat-empty">
          <div className="chat-empty__icon">💬</div>
          <span>No messages yet — be the first to say something!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-message-list">
      {messages.map((msg) => (
        <MessageRow
          key={msg.id}
          msg={msg}
          isSelf={msg.user_id === currentUserId}
          isOnline={onlineUserIds.has(msg.user_id)}
          onReply={() => onReply(msg)}
          onOpenThread={() => onOpenThread(msg)}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}
