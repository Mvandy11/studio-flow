import type { Channel, ChannelId } from '../../modules/chat/channels';

interface ChannelListProps {
  channels:         Channel[];
  currentChannelId: ChannelId;
  unreadCounts:     Record<string, number>;
  onlineCount:      number;
  onSelect:         (id: ChannelId) => void;
}

export default function ChannelList({
  channels,
  currentChannelId,
  unreadCounts,
  onlineCount,
  onSelect,
}: ChannelListProps) {
  return (
    <div className="chat-channel-list">
      <div className="chat-channel-list__header">Channels</div>

      <div className="chat-channel-list__channels">
        {channels.map((ch) => {
          const unread = unreadCounts[ch.id] ?? 0;
          const isActive = ch.id === currentChannelId;

          return (
            <button
              key={ch.id}
              className={`chat-channel-btn${isActive ? ' chat-channel-btn--active' : ''}`}
              onClick={() => onSelect(ch.id)}
            >
              <span className="chat-channel-btn__icon">{ch.icon}</span>
              <span className="chat-channel-btn__label">{ch.label}</span>
              {unread > 0 && !isActive && (
                <span className="chat-unread-badge">{unread > 99 ? '99+' : unread}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="chat-channel-list__footer">
        <span className="chat-online-dot" />
        <span>{onlineCount} online</span>
      </div>
    </div>
  );
}
