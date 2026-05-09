import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import '../styles/admin.css';
import API_BASE from '../lib/apiBase.js';

const TABS = ['Overview', 'Contests', 'Events', 'Submissions', 'Announcements', 'Moderation'];

export default function AdminDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');

  const [contests,      setContests]      = useState([]);
  const [events,        setEvents]        = useState([]);
  const [submissions,   setSubmissions]   = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({ contests: 0, events: 0, submissions: 0, announcements: 0 });
  const [loading, setLoading] = useState(true);

  // Announcement form
  const [showAnnForm,   setShowAnnForm]   = useState(false);
  const [editingAnn,    setEditingAnn]    = useState(null);
  const [annTitle,      setAnnTitle]      = useState('');
  const [annBody,       setAnnBody]       = useState('');
  const [annPinned,     setAnnPinned]     = useState(false);
  const [annSaving,     setAnnSaving]     = useState(false);
  const [annError,      setAnnError]      = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isCreatorAdmin(role)) { navigate('/'); return; }
    loadAll();
  }, [authLoading, role]);

  async function loadAll() {
    setLoading(true);
    const [
      { data: c },
      { data: e },
      { data: s },
    ] = await Promise.all([
      supabase.from('contests').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('events').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('contest_entries').select('*, contests(title)').order('created_at', { ascending: false }).limit(100),
    ]);

    // Fetch announcements via the API (which enforces admin check server-side)
    let anns = [];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/api/announcements`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      anns = json.data || [];
    } catch (_) {}

    setContests(c || []);
    setEvents(e || []);
    setSubmissions(s || []);
    setAnnouncements(anns);
    setStats({
      contests:      (c || []).length,
      events:        (e || []).length,
      submissions:   (s || []).length,
      announcements: anns.length,
    });
    setLoading(false);
  }

  async function updateContestStatus(id, status) {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${API_BASE}/api/contests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ status }),
    });
    loadAll();
  }

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async function saveAnnouncement() {
    if (!annTitle.trim() || !annBody.trim()) { setAnnError('Title and body required.'); return; }
    setAnnSaving(true);
    setAnnError('');
    try {
      const token  = await getToken();
      const url    = editingAnn ? `${API_BASE}/api/announcements/${editingAnn.id}` : `${API_BASE}/api/announcements`;
      const method = editingAnn ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: annTitle, body: annBody, pinned: annPinned }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed.');
      resetAnnForm();
      loadAll();
    } catch (err) {
      setAnnError(err.message);
    } finally {
      setAnnSaving(false);
    }
  }

  async function deleteAnnouncement(id) {
    if (!confirm('Delete this announcement?')) return;
    const token = await getToken();
    await fetch(`${API_BASE}/api/announcements/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadAll();
  }

  function startEditAnn(a) {
    setEditingAnn(a);
    setAnnTitle(a.title);
    setAnnBody(a.body);
    setAnnPinned(a.pinned || false);
    setShowAnnForm(true);
  }

  function resetAnnForm() {
    setShowAnnForm(false);
    setEditingAnn(null);
    setAnnTitle(''); setAnnBody(''); setAnnPinned(false); setAnnError('');
  }

  if (authLoading || loading) return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <div className="cinematic-spinner" />
    </div>
  );

  return (
    <div className="page-container page-container--wide">
      <div className="page-header">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f2c98f', background: 'rgba(242,201,143,0.1)', border: '1px solid rgba(242,201,143,0.25)', borderRadius: '4px', padding: '0.2rem 0.55rem' }}>
            🛡 Admin
          </span>
        </div>
        <h1 className="page-title">Studio Flow Admin</h1>
        <p className="page-subtitle">Platform management for Michael Vandeventer</p>
      </div>

      {/* Stats */}
      <div className="admin-stats" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-stat-card admin-stat-card--blue">
          <div className="admin-stat-value">{stats.contests}</div>
          <div className="admin-stat-label">Contests</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.events}</div>
          <div className="admin-stat-label">Events</div>
        </div>
        <div className="admin-stat-card admin-stat-card--green">
          <div className="admin-stat-value">{stats.submissions}</div>
          <div className="admin-stat-label">Submissions</div>
        </div>
        <div className="admin-stat-card admin-stat-card--gold">
          <div className="admin-stat-value">{stats.announcements}</div>
          <div className="admin-stat-label">Announcements</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`admin-tab${activeTab === tab ? ' admin-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="admin-panel">
        {/* ── Overview ── */}
        {activeTab === 'Overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="admin-section-header">
              <h2 className="admin-section-title">Recent Submissions</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {submissions.slice(0, 5).map((s) => (
                <div key={s.id} className="admin-submission-card">
                  <div className="admin-submission-body">
                    <p className="admin-submission-title">{s.title}</p>
                    <p className="admin-submission-meta">
                      Contest: {s.contests?.title || '—'} ·{' '}
                      {s.created_at ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true }) : ''}
                    </p>
                  </div>
                  {s.file_url && (
                    <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="admin-action-btn">
                      View File
                    </a>
                  )}
                </div>
              ))}
              {submissions.length === 0 && <p className="admin-empty">No submissions yet.</p>}
            </div>

            {announcements.length > 0 && (
              <>
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Recent Announcements</h2>
                  <button className="admin-action-btn" onClick={() => setActiveTab('Announcements')}>
                    Manage
                  </button>
                </div>
                {announcements.slice(0, 3).map((a) => (
                  <div key={a.id} style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {a.pinned && <span style={{ fontSize: '0.7rem' }}>📌</span>}
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{a.title}</p>
                    </div>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'rgba(200,200,215,0.5)' }}>
                      {a.created_at ? format(new Date(a.created_at), 'MMM d, yyyy') : ''}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Contests ── */}
        {activeTab === 'Contests' && (
          <div>
            <div className="admin-section-header">
              <h2 className="admin-section-title">All Contests</h2>
              <Link to="/contests/create" className="btn btn--primary" style={{ textDecoration: 'none' }}>
                + Create
              </Link>
            </div>
            {contests.length === 0
              ? <p className="admin-empty">No contests yet.</p>
              : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Title</th><th>Status</th><th>Prize</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {contests.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <Link to={`/contests/${c.id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
                              {c.title}
                            </Link>
                          </td>
                          <td><span className={`admin-badge admin-badge--${c.status}`}>{c.status}</span></td>
                          <td>{c.prize_pool > 0 ? `$${Number(c.prize_pool).toLocaleString()}` : '—'}</td>
                          <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {c.status === 'draft'  && <button className="admin-action-btn" onClick={() => updateContestStatus(c.id, 'active')}>Publish</button>}
                            {c.status === 'active' && <button className="admin-action-btn" onClick={() => updateContestStatus(c.id, 'voting')}>Open Voting</button>}
                            {c.status === 'voting' && <button className="admin-action-btn" onClick={() => updateContestStatus(c.id, 'completed')}>End Contest</button>}
                            <button className="admin-action-btn admin-action-btn--danger" onClick={() => updateContestStatus(c.id, 'archived')}>Archive</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        )}

        {/* ── Events ── */}
        {activeTab === 'Events' && (
          <div>
            <div className="admin-section-header">
              <h2 className="admin-section-title">All Events</h2>
              <Link to="/events/create" className="btn btn--primary" style={{ textDecoration: 'none' }}>+ Create</Link>
            </div>
            {events.length === 0
              ? <p className="admin-empty">No events yet.</p>
              : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Title</th><th>Paid?</th><th>Price</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {events.map((ev) => (
                        <tr key={ev.id}>
                          <td>{ev.title}</td>
                          <td>{ev.is_paid_event ? 'Yes' : 'Free'}</td>
                          <td>{ev.ticket_price > 0 ? `$${ev.ticket_price}` : '—'}</td>
                          <td>
                            {ev.stage_room_id && (
                              <Link to={`/stage/${ev.stage_room_id}`} className="admin-action-btn" style={{ textDecoration: 'none' }}>
                                View Stage
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        )}

        {/* ── Submissions ── */}
        {activeTab === 'Submissions' && (
          <div>
            <h2 className="admin-section-title" style={{ marginBottom: '1rem' }}>Contest Submissions</h2>
            {submissions.length === 0
              ? <p className="admin-empty">No submissions yet.</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {submissions.map((s) => (
                    <div key={s.id} className="admin-submission-card">
                      {s.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(s.file_url) && (
                        <img src={s.file_url} alt={s.title} className="admin-submission-thumb" />
                      )}
                      <div className="admin-submission-body">
                        <p className="admin-submission-title">{s.title}</p>
                        <p className="admin-submission-meta">
                          {s.contests?.title || 'Unknown contest'} · {s.submitter_email || '—'} ·{' '}
                          {s.created_at ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true }) : ''}
                        </p>
                        {s.description && <p style={{ fontSize: '0.82rem', opacity: 0.6, margin: '0.25rem 0 0' }}>{s.description}</p>}
                      </div>
                      {s.file_url && (
                        <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="admin-action-btn">
                          View File
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── Announcements ── */}
        {activeTab === 'Announcements' && (
          <div>
            <div className="admin-section-header">
              <h2 className="admin-section-title">Announcements</h2>
              {!showAnnForm && (
                <button className="btn btn--primary" onClick={() => setShowAnnForm(true)}>
                  + New
                </button>
              )}
            </div>

            {showAnnForm && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>
                  {editingAnn ? 'Edit Announcement' : 'New Announcement'}
                </h3>
                {annError && <p style={{ color: '#fca5a5', fontSize: '0.83rem', marginBottom: '0.75rem' }}>{annError}</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Title *</label>
                    <input className="form-input" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Title" disabled={annSaving} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Body *</label>
                    <textarea className="form-textarea" value={annBody} onChange={(e) => setAnnBody(e.target.value)} placeholder="Announcement text…" rows={4} disabled={annSaving} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={annPinned} onChange={(e) => setAnnPinned(e.target.checked)} disabled={annSaving} style={{ accentColor: 'var(--accent-blue)', width: '1rem', height: '1rem' }} />
                    <span>Pin to top</span>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button className="cinematic-button" onClick={resetAnnForm} disabled={annSaving}>Cancel</button>
                  <button className="btn btn--primary" onClick={saveAnnouncement} disabled={annSaving}>
                    {annSaving ? 'Saving…' : editingAnn ? 'Save' : 'Publish'}
                  </button>
                </div>
              </div>
            )}

            {announcements.length === 0 && !showAnnForm && (
              <p className="admin-empty">No announcements yet.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {announcements.map((a) => (
                <div key={a.id} style={{ background: a.pinned ? 'rgba(245,166,35,0.06)' : 'rgba(255,255,255,0.025)', border: `1px solid ${a.pinned ? 'rgba(245,166,35,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      {a.pinned && <span style={{ fontSize: '0.72rem' }}>📌</span>}
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.title}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(200,200,215,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.body}
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.73rem', color: 'rgba(200,200,215,0.35)' }}>
                      {a.created_at ? format(new Date(a.created_at), 'MMM d, yyyy') : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button className="admin-action-btn" onClick={() => startEditAnn(a)}>Edit</button>
                    <button className="admin-action-btn admin-action-btn--danger" onClick={() => deleteAnnouncement(a.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Moderation ── */}
        {activeTab === 'Moderation' && (
          <div>
            <h2 className="admin-section-title" style={{ marginBottom: '1rem' }}>Moderation Tools</h2>
            <p style={{ color: 'rgba(200,200,215,0.5)', fontSize: '0.9rem' }}>
              Moderation tools including content removal, user management, and abuse reports will be added here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
