import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';
import { api } from '../lib/api.js';
import { format } from 'date-fns';

export default function AnnouncementsPage() {
  const { user, role } = useAuth();
  const isAdmin = isCreatorAdmin(role);

  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // form state
  const [showForm,    setShowForm]    = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [formTitle,   setFormTitle]   = useState('');
  const [formBody,    setFormBody]    = useState('');
  const [formPinned,  setFormPinned]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState('');

  // expanded state for "read more"
  const [expanded, setExpanded] = useState(new Set());

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api('/api/announcements');
      setAnnouncements(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function getToken() {
    const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());
    return session?.access_token;
  }

  async function handleSave() {
    if (!formTitle.trim() || !formBody.trim()) {
      setFormError('Title and body are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const { supabase: sb } = await import('../lib/supabase');
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;

      const path   = editingId ? `/api/announcements/${editingId}` : '/api/announcements';
      const method = editingId ? 'PATCH' : 'POST';

      await api(path, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: formTitle, body: formBody, pinned: formPinned }),
      });
      resetForm();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return;
    try {
      const { supabase: sb } = await import('../lib/supabase');
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;
      await api(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      load();
    } catch (_) {}
  }

  function startEdit(a) {
    setEditingId(a.id);
    setFormTitle(a.title);
    setFormBody(a.body);
    setFormPinned(a.pinned || false);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormTitle('');
    setFormBody('');
    setFormPinned(false);
    setFormError('');
  }

  function toggleExpand(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const BODY_PREVIEW_LEN = 280;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">📢 Announcements</h1>
          <p className="page-subtitle">
            Winner announcements, reward pool updates, contest summaries, and creator highlights.
          </p>
        </div>
        {isAdmin && !showForm && (
          <button className="btn btn--primary" onClick={() => setShowForm(true)}>
            + New Announcement
          </button>
        )}
      </div>

      {/* ── Admin Form ── */}
      {isAdmin && showForm && (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1.25rem', color: 'var(--text-primary, #fff)' }}>
            {editingId ? '✏ Edit Announcement' : '✦ New Announcement'}
          </h2>

          {formError && (
            <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{formError}</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label className="form-label">Title *</label>
              <input
                className="form-input"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Announcement title"
                disabled={saving}
              />
            </div>
            <div>
              <label className="form-label">Body *</label>
              <textarea
                className="form-textarea"
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder="Full announcement text…"
                rows={5}
                disabled={saving}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={formPinned}
                onChange={(e) => setFormPinned(e.target.checked)}
                disabled={saving}
                style={{ accentColor: 'var(--accent-blue)', width: '1rem', height: '1rem' }}
              />
              <span>Pin to top</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button className="cinematic-button" onClick={resetForm} disabled={saving}>Cancel</button>
            <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Publish'}
            </button>
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ai-card ai-card--skeleton" style={{ height: '120px', borderRadius: '14px' }} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && announcements.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'rgba(200,200,215,0.5)' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📢</p>
          <p>No announcements yet. Check back soon!</p>
        </div>
      )}

      {/* ── Announcements list ── */}
      {!loading && announcements.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {announcements.map((a) => {
            const isLong      = a.body.length > BODY_PREVIEW_LEN;
            const isExpanded  = expanded.has(a.id);
            const displayBody = isLong && !isExpanded
              ? a.body.slice(0, BODY_PREVIEW_LEN) + '…'
              : a.body;

            return (
              <div
                key={a.id}
                style={{
                  background: a.pinned ? 'rgba(245,166,35,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${a.pinned ? 'rgba(245,166,35,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '14px',
                  padding: '1.25rem 1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      {a.pinned && (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                          color: 'var(--accent-gold, #f2c98f)', background: 'rgba(242,201,143,0.1)',
                          border: '1px solid rgba(242,201,143,0.25)', borderRadius: '4px', padding: '0.15rem 0.45rem',
                        }}>
                          📌 Pinned
                        </span>
                      )}
                      <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary, #fff)' }}>
                        {a.title}
                      </h2>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.45)', margin: '0 0 0.75rem' }}>
                      {a.created_at ? format(new Date(a.created_at), 'MMM d, yyyy') : ''}
                    </p>
                    <p style={{ fontSize: '0.925rem', color: 'rgba(220,220,235,0.8)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {displayBody}
                    </p>
                    {isLong && (
                      <button
                        onClick={() => toggleExpand(a.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-blue, #6ea8ff)', fontSize: '0.85rem', cursor: 'pointer', padding: '0.4rem 0 0', fontWeight: 600 }}
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button className="admin-action-btn" onClick={() => startEdit(a)}>Edit</button>
                      <button className="admin-action-btn admin-action-btn--danger" onClick={() => handleDelete(a.id)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
