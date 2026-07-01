import { Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MyVideos() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem', textAlign: 'center', padding: '0 1.5rem' }}>
      <Film size={64} color="#FACC15" />
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: 0 }}>My Videos</h1>
      <p style={{ color: '#9CA3AF', maxWidth: 440, margin: 0, lineHeight: 1.6 }}>
        Videos you generate will appear here. You can post them to the Feed or submit them to a Contest directly from this page.
      </p>
      <button
        onClick={() => navigate('/generator')}
        style={{ background: '#FACC15', color: '#000', fontWeight: 700, padding: '10px 24px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
      >
        Create a Video
      </button>
    </div>
  );
}
