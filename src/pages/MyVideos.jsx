import { useEffect, useState } from 'react';
import { Film, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

export default function MyVideos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!user) return;
    async function fetchVideos() {
      try {
        const { data, error } = await supabase
          .from('render_jobs')
          .select('*')
          .eq('member_id', user.id)
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

  async function handleDelete(e, videoId) {
    e.stopPropagation();
    if (!window.confirm('Delete this video? This cannot be undone.')) return;
    setDeleting(videoId);
    await supabase.from('render_jobs').delete().eq('id', videoId);
    setVideos(prev => prev.filter(v => v.id !== videoId));
    setDeleting(null);
  }

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
        Your videos will appear here.<br />
        Hit "Generate My Video" to create your first emotion-rendered video.
      </p>
      <button onClick={() => navigate('/generator')} style={{ background: '#FACC15', color: '#000', fontWeight: 700, padding: '10px 24px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}>
        Generate My Video
      </button>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Lightbox modal */}
      {playing && (
        <div
          onClick={() => setPlaying(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 800 }}>
            <button
              onClick={() => setPlaying(null)}
              style={{ position: 'absolute', top: -36, right: 0, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={28} />
            </button>
            <video
              src={playing}
              controls
              autoPlay
              style={{ width: '100%', borderRadius: 12, display: 'block' }}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: 0 }}>My Videos</h1>
        <button onClick={() => navigate('/generator')} style={{ background: '#FACC15', color: '#000', fontSize: '0.875rem', fontWeight: 700, padding: '8px 16px', borderRadius: 9999, border: 'none', cursor: 'pointer' }}>
          + New Video
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {videos.map(v => {
          const statusColor = v.status === 'completed' ? { bg: 'rgba(34,197,94,0.15)', text: '#4ade80' }
            : v.status === 'rendering' ? { bg: 'rgba(234,179,8,0.15)', text: '#facc15' }
            : { bg: 'rgba(255,255,255,0.08)', text: '#9ca3af' };
          const videoUrl = Array.isArray(v.video_url) ? v.video_url[0] : v.video_url;
          return (
            <div
              key={v.id}
              onClick={() => videoUrl && setPlaying(videoUrl)}
              style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', cursor: videoUrl ? 'pointer' : 'default', position: 'relative', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(250,204,21,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
            >
              {/* Thumbnail */}
              <div style={{ width: '100%', height: 160, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {videoUrl
                  ? <video src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                  : <Film size={40} color="#4B5563" />
                }
                {videoUrl && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(250,204,21,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '18px solid #000', marginLeft: 3 }} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '0.5rem' }}>
                    {v.title || `Video ${v.created_at?.slice(0, 10) || ''}`}
                  </h3>
                  <button
                    onClick={e => handleDelete(e, v.id)}
                    disabled={deleting === v.id}
                    style={{ background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <Trash2 size={14} color="#f87171" />
                  </button>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 9999, background: statusColor.bg, color: statusColor.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {v.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
