import '../../styles/chat.css';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '../../lib/isAdmin';

import { useChatChannel }      from '../../modules/chat/channels';
import { getMessages, sendMessage, subscribeToMessages } from '../../modules/chat/messages';
import { sendAnnouncement }    from '../../modules/chat/announcements';
import { useTypingIndicator }  from '../../modules/chat/typing';
import { useOnlinePresence }   from '../../modules/chat/presence';
import { markChannelRead, useUnreadCounts } from '../../modules/chat/unread';

import type { ChatMessage } from '../../lib/types';
import type { ChannelId }   from '../../modules/chat/channels';

import ChannelList  from './ChannelList';
import MessageList  from './MessageList';
import MessageInput from './MessageInput';
import ThreadView   from './ThreadView';

interface ChatWindowProps {
  /** When provided, adds a contest-specific channel. */
  contestId?: string;
  /** CSS class added to the root element. */
  className?: string;
}

export default function ChatWindow({ contestId, className = '' }: ChatWindowProps) {
  const { user, role } = useAuth();
  const admin = isAdminRole(role);

  const { channels, currentChannelId, setCurrentChannelId } = useChatChannel(contestId);
  const channelIds = channels.map((c) => c.id);

  const [messages,     setMessages]     = useState<ChatMessage[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [replyingTo,   setReplyingTo]   = useState<ChatMessage | null>(null);
  const [threadMsg,    setThreadMsg]    = useState<ChatMessage | null>(null);
  const [sending,      setSending]      = useState(false);

  const { typingUsers, notifyTyping }  = useTypingIndicator(currentChannelId, user?.id);
  const { onlineUsers }                = useOnlinePresence(
    user?.id,
    user?.user_metadata?.name || user?.email?.split('@')[0],
    user?.user_metadata?.avatar_url,
  );
  const { counts: unreadCounts, refresh: refreshUnread } = useUnreadCounts(channelIds, user?.id);

  const onlineUserIds = new Set(onlineUsers.map((u) => u.userId));
  const onlineCount = onlineUsers.length + (user ? 1 : 0);

  // Load messages when channel changes
  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessages([]);

    getMessages(currentChannelId)
      .then((msgs) => { if (active) setMessages(msgs); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });

    // Subscribe to new messages
    const unsub = subscribeToMessages(currentChannelId, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    // Mark channel as read when opened
    if (user?.id) markChannelRead(user.id, currentChannelId).then(refreshUnread);

    return () => { active = false; unsub(); };
  }, [currentChannelId, user?.id]);

  async function handleSend(content: string, isAnnouncement: boolean) {
    if (!user?.id || sending) return;
    setSending(true);
    try {
      if (isAnnouncement && admin) {
        await sendAnnouncement(currentChannelId, content, user.id, role);
      } else {
        await sendMessage({
          channelId:       currentChannelId,
          senderId:        user.id,
          content,
          parentMessageId: replyingTo?.id ?? null,
        });
      }
      setReplyingTo(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  function handleSelectChannel(id: ChannelId) {
    setCurrentChannelId(id);
    setThreadMsg(null);
    setReplyingTo(null);
    if (user?.id) markChannelRead(user.id, id).then(refreshUnread);
  }

  const currentChannel = channels.find((c) => c.id === currentChannelId);

  return (
    <div className={`chat-window chat-window--full ${className}`}>
      {/* Left: channel list */}
      <ChannelList
        channels={channels}
        currentChannelId={currentChannelId}
        unreadCounts={unreadCounts}
        onlineCount={onlineCount}
        onSelect={handleSelectChannel}
      />

      {/* Centre: messages + input */}
      <div className="chat-main">
        <div className="chat-main__header">
          <span className="chat-main__channel-icon">{currentChannel?.icon ?? '💬'}</span>
          <span>{currentChannel?.label ?? 'Chat'}</span>
          {onlineCount > 1 && (
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#22c55e' }}>
              ● {onlineCount} online
            </span>
          )}
        </div>

        <MessageList
          messages={messages}
          loading={loading}
          currentUserId={user?.id}
          onlineUserIds={onlineUserIds}
          onReply={setReplyingTo}
          onOpenThread={setThreadMsg}
        />

        {/* Typing indicator */}
        <div className="chat-typing">
          {typingUsers.length > 0 && (
            <>
              <div className="chat-typing__dots">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="chat-typing__dot" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              <span>
                {typingUsers.length === 1
                  ? 'Someone is typing…'
                  : `${typingUsers.length} people are typing…`}
              </span>
            </>
          )}
        </div>

        <MessageInput
          onSend={handleSend}
          onTyping={notifyTyping}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          disabled={sending}
        />
      </div>

      {/* Right: thread view (conditional) */}
      {threadMsg && (
        <ThreadView
          parentMessage={threadMsg}
          channelId={currentChannelId}
          onClose={() => setThreadMsg(null)}
        />
      )}
    </div>
  );
}
