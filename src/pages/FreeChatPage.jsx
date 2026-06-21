import ChatWindow from '../components/chat/ChatWindow';

export default function FreeChatPage() {
  return (
    <div style={{ padding: '1rem', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '0.75rem', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>🗣 Free Chat</h1>
        <p style={{ color: 'var(--text-muted, #888)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          Open community chat — General, Announcements, and contest-specific channels. No subscription required.
        </p>
      </div>

      {/* Full-height ChatWindow — General channel by default */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ChatWindow />
      </div>
    </div>
  );
}
