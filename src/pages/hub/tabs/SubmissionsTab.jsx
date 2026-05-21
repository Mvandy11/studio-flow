import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { api } from '../../../lib/api.js';
import { useAuth } from '../../../hooks/useAuth.js';

export default function SubmissionsTab() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      try {
        const data = await api('/api/submissions', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        setSubmissions(Array.isArray(data) ? data : []);
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, [user]);

  if (!user) return (
    <div className="hub-content" style={{ textAlign: 'center', paddingTop: '3rem' }}>
      <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📬</p>
      <p style={{ color: 'var(--hub-muted)' }}>Log in to view your submissions.</p>
    </div>
  );

  return (
    <div className="hub-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 className="hub-section-title" style={{ margin: 0 }}>📬 My Submissions</h2>
        <button
          className="hub-btn hub-btn--primary"
          onClick={() => navigate('/contests')}
        >
          Enter a Contest →
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: '2rem' }}>
          <div className="cinematic-spinner" />
        </div>
      ) : submissions.length === 0 ? (
        <div style={{
          textAlign: 'center', paddingTop: '3rem',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '3rem 2rem',
        }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</p>
          <p style={{ fontWeight: 700, marginBottom: '0.4rem' }}>No submissions yet</p>
          <p style={{ color: 'var(--hub-muted)', fontSize: '0.875rem' }}>
            Enter a contest or custom event to see your submissions here.
          </p>
          <button
            className="hub-btn hub-btn--primary"
            style={{ marginTop: '1.25rem' }}
            onClick={() => navigate('/contests')}
          >
            Browse Contests
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {submissions.map((s) => (
            <div key={s.id} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  {s.title || s.user_name || 'Submission'}
                </p>
                {s.description && (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--hub-muted)' }}>{s.description}</p>
                )}
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'rgba(200,200,215,0.3)' }}>
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
              <span style={{
                padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                textTransform: 'uppercase',
                background: s.status === 'approved' ? 'rgba(34,197,94,0.12)' : s.status === 'rejected' ? 'rgba(239,68,68,0.12)' : 'rgba(245,166,35,0.12)',
                color: s.status === 'approved' ? '#22c55e' : s.status === 'rejected' ? '#f87171' : 'var(--hub-gold)',
                border: `1px solid ${s.status === 'approved' ? 'rgba(34,197,94,0.3)' : s.status === 'rejected' ? 'rgba(239,68,68,0.3)' : 'rgba(245,166,35,0.3)'}`,
              }}>
                {s.status || 'pending'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
