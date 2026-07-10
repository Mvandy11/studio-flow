import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { isCreatorAdmin } from '../../lib/roles';

/**
 * Admin Error Dashboard — /admin/errors
 *
 * Displays the last 200 backend errors stored in the backend_errors table.
 * Accessible only to creator_admin / admin users.
 */
export default function AdminErrorsDashboard() {
  const { user, role } = useAuth();
  const [errors,   setErrors]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState('');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    setFetchErr('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/errors', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load errors.');
      setErrors(json.errors || []);
    } catch (e) {
      setFetchErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function fmt(ts) {
    try { return new Date(ts).toLocaleString(); }
    catch { return ts; }
  }

  if (!isCreatorAdmin(role)) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(200,200,215,0.5)' }}>
        Access denied.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link to="/admin" style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.8rem', textDecoration: 'none' }}>
            ← Back to Admin
          </Link>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: '0.5rem 0 0.25rem' }}>
            Error Logs
          </h1>
          <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.85rem', margin: 0 }}>
            Last 200 backend errors — newest first
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '0.5rem 1.1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)', color: 'rgba(200,200,215,0.7)',
            fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Loading…' : '↺ Refresh'}
        </button>
      </div>

      {fetchErr && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.75rem 1rem', color: '#fca5a5', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {fetchErr}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', color: 'rgba(200,200,215,0.35)', padding: '3rem 0', fontSize: '0.9rem' }}>
          Loading error logs…
        </div>
      )}

      {!loading && errors.length === 0 && !fetchErr && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
          <p style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.9rem' }}>No backend errors recorded.</p>
        </div>
      )}

      {!loading && errors.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {errors.map((e) => (
            <div
              key={e.id}
              style={{
                background: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.18)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              {/* Summary row */}
              <div
                style={{ padding: '0.875rem 1.1rem', cursor: e.stack ? 'pointer' : 'default', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}
                onClick={() => e.stack && toggle(e.id)}
              >
                <span style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }}>⚠</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <code style={{ fontSize: '0.72rem', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', padding: '1px 6px', borderRadius: '4px' }}>
                      {e.route || '—'}
                    </code>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.35)' }}>
                      {fmt(e.created_at)}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: 'rgba(220,220,235,0.85)', wordBreak: 'break-word' }}>
                    {e.message || '(no message)'}
                  </p>
                </div>
                {e.stack && (
                  <span style={{ color: 'rgba(200,200,215,0.3)', fontSize: '0.75rem', flexShrink: 0, marginTop: '2px' }}>
                    {expanded[e.id] ? '▲ hide' : '▼ stack'}
                  </span>
                )}
              </div>

              {/* Stack trace — expandable */}
              {expanded[e.id] && e.stack && (
                <div style={{ borderTop: '1px solid rgba(239,68,68,0.12)', padding: '0.75rem 1.1rem', background: 'rgba(0,0,0,0.25)' }}>
                  <pre style={{
                    margin: 0, fontSize: '0.72rem', color: 'rgba(200,200,215,0.5)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6,
                    maxHeight: '320px', overflowY: 'auto',
                  }}>
                    {e.stack}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
