import { useState } from 'react';
import type { ChatMessage } from '../../lib/types';
import { useReactions, addReaction, removeReaction } from '../../modules/chat';
import { useAuth } from '../../hooks/useAuth';
import { useThread } from '../../modules/chat/threads';

const REACTION_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '👏'];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)  return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function senderInitial(id: string): string {
  return id.slice(0, 2).toUpperCase();
}

interface MessageRowProps {
  msg:          ChatMessage;
  isSelf:       boolean;
  isOnline:     boolean;
  onReply:      () => void;
  onOpenThread: () => void;
}

export default function MessageRow({ msg, isSelf, isOnline, onReply, onOpenThread }: MessageRowProps) {
  const { user } = useAuth();
  const { grouped } = useReactions(msg.id);
  const { replyCount } = useThread(msg.id);
  const [showPicker, setShowPicker] = useState(false);

  async function handleReaction(emoji: string) {
    if (!user?.id) return;
    const alreadyReacted = grouped.find((g) => g.emoji === emoji)?.userIds.includes(user.id);
    if (alreadyReacted) {
      await removeReaction(msg.id, user.id, emoji);
    } else {
      await addReaction(msg.id, user.id, emoji);
    }
    setShowPicker(false);
  }

  const isAnnouncement = (msg as any).is_announcement;
  const senderName = (msg as any).display_name || msg.sender_id.slice(0, 8);
  const initial = senderInitial(msg.sender_id);

  return (
    <div className={`chat-msg${isAnnouncement ? ' chat-msg--announcement' : ''}`}>
      {/* Avatar */}
      <div className="chat-msg__avatar">
        {initial}
        {isOnline && <span className="chat-msg__online-dot" />}
      </div>

      {/* Body */}
      <div className="chat-msg__body">
        <div className="chat-msg__meta">
          <span className={`chat-msg__sender${isAnnouncement ? ' chat-msg__sender--admin' : ''}`}>
            {senderName}
          </span>
          {isAnnouncement && (
            <span className="chat-msg__announcement-badge">📢 Announcement</span>
          )}
          <span className="chat-msg__time">{formatTime(msg.created_at)}</span>
        </div>

        <div className="chat-msg__text">{msg.message}</div>

        {/* Reactions */}
        {grouped.length > 0 && (
          <div className="chat-reactions">
            {grouped.map((g) => {
              const iMine = user?.id ? g.userIds.includes(user.id) : false;
              return (
                <button
                  key={g.emoji}
                  className={`chat-reaction-btn${iMine ? ' chat-reaction-btn--active' : ''}`}
                  onClick={() => handleReaction(g.emoji)}
                  title={`${g.count} reaction${g.count !== 1 ? 's' : ''}`}
                >
                  {g.emoji} <span>{g.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Thread indicator */}
        {replyCount > 0 && (
          <button className="chat-thread-indicator" onClick={onOpenThread}>
            ↩ {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Hover actions */}
      <div className="chat-msg__actions">
        {/* Reaction picker */}
        <div style={{ position: 'relative' }}>
          <button
            className="chat-msg__action-btn"
            title="React"
            onClick={() => setShowPicker((v) => !v)}
          >
            😀
          </button>
          {showPicker && (
            <div className="chat-reaction-picker" style={{ display: 'flex' }}>
              {REACTION_EMOJIS.map((e) => (
                <button key={e} className="chat-reaction-picker__emoji" onClick={() => handleReaction(e)}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="chat-msg__action-btn" onClick={onReply} title="Reply in thread">
          ↩ Reply
        </button>

        {replyCount > 0 && (
          <button className="chat-msg__action-btn" onClick={onOpenThread} title="Open thread">
            Thread
          </button>
        )}
      </div>
    </div>
  );
}
