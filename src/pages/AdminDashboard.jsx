import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import '../styles/admin.css';
import { api } from '../lib/api.js';

const TABS = ['Overview', 'Contests', 'Events', 'Submissions', 'Announcements', 'Requests', 'Moderation'];

export default function AdminDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');

  const [contests,        setContests]        = useState([]);
  const [events,          setEvents]          = useState([]);
  const [submissions,     setSubmissions]     = useState([]); // contest_entries
  const [genSubmissions,  setGenSubmissions]  = useState([]); // submissions table
  const [announcements,   setAnnouncements]   = useState([]);
  const [stats, setStats] = useState({ contests: 0, events: 0, submissions: 0, announcements: 0 });
  const [loading, setLoading] = useState(true);

  // Announcement form
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [editingAnn,  setEditingAnn]  = useState(null);
  const [annTitle,    setAnnTitle]    = useState('');
  const [annBody,     setAnnBody]     = useState('');
  const [annPinned,   setAnnPinned]   = useState(false);
  const [annSaving,   setAnnSaving]   = useState(false);
  const [annError,    setAnnError]    = useState('');

  // Submission approval modal
  const [approvingSubmission, setApprovingSubmission] = useState(null);
  const [slotTitle,           setSlotTitle]           = useState('');
  const [slotPassword,        setSlotPassword]        = useState('');
  const [approvalSaving,      setApprovalSaving]      = useState(false);
  const [approvalError,       setApprovalError]       = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isCreatorAdmin(role)) { navigate('/'); return; }
    loadAll();
  }, [authLoading, role]);

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

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

    let anns = [];
    let genSubs = [];
    try {
      const token = await getToken();
      const [annJson, subJson] = await Promise.all([
        api('/api/announcements', { headers: { Authorization: `Bearer ${token}` } }),
        api('/api/submissions',   { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      anns    = annJson.data  || [];
      genSubs = Array.isArray(subJson) ? subJson : [];
    } catch (_) {}

    setContests(c || []);
    setEvents(e || []);
    setSubmissions(s || []);
    setGenSubmissions(genSubs);
    setAnnouncements(anns);
    setStats({
      contests:      (c || []).length,
      events:        (e || []).length,
      submissions:   genSubs.length,
      announcements: anns.length,
    });
    setLoading(false);
  }

  async function updateContestStatus(id, status) {
    const token = await getToken();
    await api(`/api/contests/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ status }),
    });
    loadAll();
  }

  async function triggerPayout(contestId) {
    if (!confirm('Trigger payout for all marked winners? This will record earnings in their accounts.')) return;
    try {
      const token = await getToken();
      const result = await api(`/api/contests/${contestId}/payout`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`Payout recorded: ${result.winners} winner(s), $${result.prizeShare} each.`);
      loadAll();
    } catch (err) {
      alert(`Payout error: ${err.message}`);
    }
  }

  async function deleteEvent(id) {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    try {
      const token = await getToken();
      await api(`/api/events/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadAll();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  }

  async function updateEventStatus(id, status) {
    try {
      const token = await getToken();
      await api(`/api/events/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ status }),
      });
      loadAll();
    } catch (err) {
      alert(`Update error: ${err.message}`);
    }
  }

  // ── Announcements ──────────────────────────────────────────
  async function saveAnnouncement() {
    if (!annTitle.trim() || !annBody.trim()) { setAnnError('Title and body required.'); return; }
    setAnnSaving(true);
    setAnnError('');
    try {
      const token  = await getToken();
      const path   = editingAnn ? `/api/announcements/${editingAnn.id}` : '/api/announcements';
      const method = editingAnn ? 'PATCH' : 'POST';
      await api(path, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: annTitle, body: annBody, pinned: annPinned }),
      });
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
    await api(`/api/announcements/${id}`, {
      method:  'DELETE',
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

  // ── Submission approval ────────────────────────────────────
  function openApproveModal(sub) {
    setApprovingSubmission(sub);
    setSlotTitle(sub.title || sub.user_name || '');
    setSlotPassword('');
    setApprovalError('');
  }

  function closeApproveModal() {
    setApprovingSubmission(null);
    setSlotTitle('');
    setSlotPassword('');
    setApprovalError('');
  }

  async function approveSubmission() {
    if (!slotTitle.trim() || !slotPassword.trim()) {
      setApprovalError('Slot title and password are required.');
      return;
    }
    setApprovalSaving(true);
    setApprovalError('');
    try {
      const token = await getToken();
      await api('/api/admin/approve', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          submission_id: approvingSubmission.id,
          user_id:       approvingSubmission.user_id,
          title:         slotTitle.trim(),
          password:      slotPassword.trim(),
        }),
      });
      closeApproveModal();
      loadAll();
    } catch (err) {
      setApprovalError(err.message);
    } finally {
      setApprovalSaving(false);
    }
  }

  async function rejectSubmission(id) {
    const reason = prompt('Optional rejection reason (leave blank to skip):');
    if (reason === null) return; // cancelled
    try {
      const token = await getToken();
      await api('/api/admin/reject', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ submission_id: id, reason: reason.trim() || undefined }),
      });
      loadAll();
    } catch (err) {
      alert(`Reject error: ${err.message}`);
    }
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
              <h2 className="admin-section-title">Recent Contest Entries</h2>
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
              {submissions.length === 0 && <p className="admin-empty">No contest entries yet.</p>}
            </div>

            {genSubmissions.filter((s) => s.status === 'pending').length > 0 && (
              <>
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Pending Submissions</h2>
                  <button className="admin-action-btn" onClick={() => setActiveTab('Submissions')}>
                    Review All
                  </button>
                </div>
                {genSubmissions.filter((s) => s.status === 'pending').slice(0, 3).map((s) => (
                  <div key={s.id} style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{s.user_name || 'Unnamed'}</p>
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'rgba(200,200,215,0.45)' }}>{s.user_email}</p>
                    </div>
                    <span className="admin-badge admin-badge--pending">pending</span>
                  </div>
                ))}
              </>
            )}

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
                      <tr><th>Title</th><th>Status</th><th>Prize</th><th>Entries</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {contests.map((c) => {
                        const entryCount = submissions.filter((s) => s.contest_id === c.id).length;
                        return (
                          <tr key={c.id}>
                            <td>
                              <Link to={`/contests/${c.id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
                                {c.title}
                              </Link>
                            </td>
                            <td><span className={`admin-badge admin-badge--${c.status}`}>{c.status}</span></td>
                            <td>{c.prize_pool > 0 ? `$${Number(c.prize_pool).toLocaleString()}` : '—'}</td>
                            <td style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.82rem' }}>{entryCount}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {c.status === 'draft'     && <button className="admin-action-btn" onClick={() => updateContestStatus(c.id, 'active')}>Publish</button>}
                                {c.status === 'active'    && <button className="admin-action-btn" onClick={() => updateContestStatus(c.id, 'voting')}>Open Voting</button>}
                                {c.status === 'voting'    && <button className="admin-action-btn" onClick={() => updateContestStatus(c.id, 'completed')}>End Contest</button>}
                                {c.status === 'completed' && c.prize_pool > 0 && (
                                  <button className="admin-action-btn" style={{ borderColor: 'rgba(134,239,172,0.3)', color: '#86efac' }} onClick={() => triggerPayout(c.id)}>
                                    Payout
                                  </button>
                                )}
                                <button className="admin-action-btn admin-action-btn--danger" onClick={() => updateContestStatus(c.id, 'archived')}>Archive</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
            <p style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.35)', marginTop: '0.75rem' }}>
              To mark winners on a contest, open the contest detail page and use the admin winner controls.
            </p>
          </div>
        )}

        {/* ── Events ── */}
        {activeTab === 'Events' && (
          <div>
            <div className="admin-section-header">
              <h2 className="admin-section-title">All Events</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to="/admin/event-requests" className="admin-action-btn" style={{ textDecoration: 'none' }}>
                  Event Requests
                </Link>
                <Link to="/events/create" className="btn btn--primary" style={{ textDecoration: 'none' }}>+ Create</Link>
              </div>
            </div>
            {events.length === 0
              ? <p className="admin-empty">No events yet.</p>
              : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Title</th><th>Mode</th><th>Status</th><th>Price</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {events.map((ev) => {
                        const mode = ev.event_mode || ev.event_type || 'live';
                        const status = ev.status || (ev.start_time && new Date(ev.start_time) < new Date() ? 'ended' : 'upcoming');
                        return (
                          <tr key={ev.id}>
                            <td>{ev.title}</td>
                            <td><span className={`admin-badge admin-badge--${mode}`}>{mode}</span></td>
                            <td><span className={`admin-badge admin-badge--${status}`}>{status}</span></td>
                            <td>{ev.ticket_price > 0 || ev.price > 0 ? `$${ev.ticket_price || ev.price}` : 'Free'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {ev.stage_room_id && (
                                  <Link to={`/stage/${ev.stage_room_id}`} className="admin-action-btn" style={{ textDecoration: 'none' }}>
                                    Stage
                                  </Link>
                                )}
                                <Link to={`/events/${ev.id}`} className="admin-action-btn" style={{ textDecoration: 'none' }}>
                                  View
                                </Link>
                                {status === 'upcoming' && (
                                  <button className="admin-action-btn" onClick={() => updateEventStatus(ev.id, 'ended')}>
                                    End
                                  </button>
                                )}
                                <button className="admin-action-btn admin-action-btn--danger" onClick={() => deleteEvent(ev.id)}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
            {/* Approval modal */}
            {approvingSubmission && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                <div style={{ background: '#111d33', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '18px', padding: '2rem', maxWidth: '440px', width: '100%' }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontWeight: 700 }}>Approve Submission</h3>
                  <p style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
                    Create an event slot for <strong>{approvingSubmission.user_name}</strong>. They will receive the slot title and upload password by email.
                  </p>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'rgba(255,255,255,0.75)' }}>
                    Slot Title
                  </label>
                  <input
                    value={slotTitle}
                    onChange={(e) => setSlotTitle(e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.875rem', color: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    disabled={approvalSaving}
                  />
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.75rem' }}>
                    Upload Password
                  </label>
                  <input
                    value={slotPassword}
                    onChange={(e) => setSlotPassword(e.target.value)}
                    placeholder="e.g. studioflow-abc123"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.875rem', color: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    disabled={approvalSaving}
                  />
                  {approvalError && <p style={{ color: '#fca5a5', fontSize: '0.83rem', marginTop: '0.5rem' }}>{approvalError}</p>}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                    <button
                      onClick={approveSubmission}
                      disabled={approvalSaving}
                      style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: approvalSaving ? 'not-allowed' : 'pointer', border: 'none', background: approvalSaving ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.2)', color: '#22c55e' }}
                    >
                      {approvalSaving ? 'Creating Slot…' : 'Approve & Create Slot'}
                    </button>
                    <button onClick={closeApproveModal} style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="admin-section-header">
              <h2 className="admin-section-title">Event Slot Submissions</h2>
              <span style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.4)' }}>
                {genSubmissions.filter((s) => !s.status || s.status === 'pending').length} pending
              </span>
            </div>

            {genSubmissions.length === 0 ? (
              <p className="admin-empty">No submissions yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '2rem' }}>
                {genSubmissions.map((s) => {
                  const status = s.status || 'pending';
                  const statusColor = { approved: '#22c55e', rejected: '#f87171', pending: '#f5a623' }[status] || '#8b9fc5';
                  return (
                    <div key={s.id} className="admin-submission-card">
                      <div className="admin-submission-body">
                        <p className="admin-submission-title">{s.user_name || 'Unnamed'}</p>
                        <p className="admin-submission-meta">
                          {s.user_email} ·{' '}
                          {s.created_at ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true }) : ''}
                        </p>
                        {s.description && <p style={{ fontSize: '0.8rem', opacity: 0.55, margin: '0.2rem 0 0' }}>{s.description}</p>}
                        {s.media_url && (
                          <a href={s.media_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.77rem', color: 'var(--accent-blue)', marginTop: '0.25rem', display: 'inline-block' }}>
                            View Media →
                          </a>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}44` }}>
                          {status}
                        </span>
                        {status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              className="admin-action-btn"
                              style={{ borderColor: 'rgba(34,197,94,0.3)', color: '#86efac' }}
                              onClick={() => openApproveModal(s)}
                            >
                              Approve
                            </button>
                            <button
                              className="admin-action-btn admin-action-btn--danger"
                              onClick={() => rejectSubmission(s.id)}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="admin-section-header" style={{ marginTop: '1rem' }}>
              <h2 className="admin-section-title">Contest Entries</h2>
              <span style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.4)' }}>{submissions.length} total</span>
            </div>
            {submissions.length === 0 ? (
              <p className="admin-empty">No contest entries yet.</p>
            ) : (
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
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
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

        {/* ── Requests ── */}
        {activeTab === 'Requests' && (
          <div>
            <div className="admin-section-header">
              <h2 className="admin-section-title">Custom Event Requests</h2>
              <Link to="/admin/event-requests" className="btn btn--primary" style={{ textDecoration: 'none' }}>
                Open Full View
              </Link>
            </div>
            <p style={{ color: 'rgba(200,200,215,0.5)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Review, approve, and assign event slots for creator custom event requests. The full management interface is on the Event Requests page.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '14px', padding: '2.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🗂</p>
              <p style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Event Request Management</p>
              <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                Approve or reject creator requests for custom event slots. Approved requests generate upload passwords and notify creators by email.
              </p>
              <Link to="/admin/event-requests" className="btn btn--primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                Manage Event Requests →
              </Link>
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
