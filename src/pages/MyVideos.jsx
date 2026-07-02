import { useEffect, useState } from 'react';
import { Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

export default function MyVideos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchVideos() {
      try {
        const { data, error } = await supabase
          .from('render_jobs')
          .select('*')
          .eq('member_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });
        if (!error) setVideos(data || []);
      } catch (e) {
        console.error('MyVideos fetch error', e);
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, [user]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
      Loading...
    </div>
  );

  if (videos.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem', textAlign: 'center', padding: '0 1.5rem' }}>
      <Film size={64} color="#FACC15" />
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: 0 }}>My Videos</h1>
      <p style={{ color: '#9CA3AF', maxWidth: 440, margin: 0, lineHeight: 1.6 }}>
        You haven't generated any videos yet. Create your identity and build your first scene.
      </p>
      <button
        onClick={() => navigate('/generator')}
        style={{ background: '#FACC15', color: '#000', fontWeight: 700, padding: '10px 24px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
      >
        Create a Video
      </button>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: 0 }}>My Videos</h1>
        <button
          onClick={() => navigate('/generator')}
          style={{ background: '#FACC15', color: '#000', fontSize: '0.875rem', fontWeight: 700, padding: '8px 16px', borderRadius: 9999, border: 'none', cursor: 'pointer' }}
        >
          + New Video
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {videos.map(v => {
          const statusColor = v.status === 'completed' ? { bg: 'rgba(34,197,94,0.15)', text: '#4ade80' }
            : v.status === 'rendering' ? { bg: 'rgba(234,179,8,0.15)', text: '#facc15' }
            : { bg: 'rgba(255,255,255,0.08)', text: '#9ca3af' };
          return (
            <div key={v.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              {v.thumbnail_url
                ? <img src={v.thumbnail_url} alt={v.title} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: 160, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Film size={40} color="#4B5563" />
                  </div>
              }
              <div style={{ padding: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.title || `Video ${v.created_at?.slice(0, 10) || ''}`}
                </h3>
                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 9999, background: statusColor.bg, color: statusColor.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {v.status}
                </span>
                {v.video_url && (
                  <video src={v.video_url} controls style={{ width: '100%', marginTop: '0.75rem', borderRadius: 8 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
