import { useParams } from 'react-router-dom';
import ChatWindow from '../components/chat/ChatWindow';

export default function ChatPage() {
  const { contestId } = useParams<{ contestId?: string }>();
  return (
    <div style={{ padding: '1rem', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>💬 Community Chat</h1>
        <p style={{ color: 'var(--text-muted, #888)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Real-time chat with channels — General, Announcements{contestId ? ', and Contest Chat' : ''}.
        </p>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ChatWindow contestId={contestId} />
      </div>
    </div>
  );
}
