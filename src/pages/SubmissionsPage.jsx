import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth';

export default function SubmissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const isAdmin = user?.email === 'obviouslyinspiredstudio@outlook.com';

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    load();
  }, [user, authLoading]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const json = await api('/submissions', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setSubmissions(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminDelete(submissionId) {
    if (!window.confirm('Remove this entry permanently?')) return;
    await supabase.from('likes').delete().eq('submission_id', submissionId);
    await supabase.from('comments').delete().eq('submission_id', submissionId);
    const { error } = await supabase.from('submissions').delete().eq('id', submissionId);
    if (error) {
      console.error('Delete failed:', error.message);
      alert('Failed to delete entry.');
    } else {
      alert('Entry removed.');
      load();
    }
  }

  if (!user && !authLoading) return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <p style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📬</p>
      <p style={{ color: 'rgba(200,200,215,0.5)' }}>Please log in to view your submissions.</p>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">📬 Submissions</h1>
        <p className="page-subtitle">All your contest and event submissions in one place.</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fca5a5', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: '3rem' }}>
          <div className="cinematic-spinner" />
        </div>
      ) : submissions.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: '3rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px', padding: '3rem 2rem' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</p>
          <p style={{ fontWeight: 700, marginBottom: '0.4rem' }}>No submissions yet</p>
          <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Enter a contest or post an event to get started.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contests" className="btn btn--primary">Browse Contests</Link>
            <Link to="/events" className="btn">Browse Events</Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {submissions.map((s) => {
            const statusColor = { approved: '#22c55e', rejected: '#f87171', pending: '#f5a623' }[s.status] || '#8b9fc5';
            return (
              <div key={s.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: '0 0 0.25rem', fontWeight: 700, fontSize: '0.95rem' }}>
                      {s.title || s.user_name || 'Submission'}
                    </p>
                    {s.description && (
                      <p style={{ margin: '0 0 0.25rem', fontSize: '0.83rem', color: 'rgba(200,200,215,0.55)' }}>{s.description}</p>
                    )}
                    {s.media_url && (
                      <a href={s.media_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'var(--accent-blue, #60a5fa)' }}>
                        View Media →
                      </a>
                    )}
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'rgba(200,200,215,0.3)' }}>
                      Submitted {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                    textTransform: 'uppercase', whiteSpace: 'nowrap',
                    background: `${statusColor}18`, color: statusColor,
                    border: `1px solid ${statusColor}44`,
                  }}>
                    {s.status || 'pending'}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleAdminDelete(s.id)}
                    style={{ marginTop: '0.5rem', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5' }}
                  >
                    🗑 Remove Entry
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
