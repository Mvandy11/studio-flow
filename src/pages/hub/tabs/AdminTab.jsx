import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.js';
import { isCreatorAdmin } from '../../../lib/roles.js';
import { supabase } from '../../../lib/supabase.js';
import { api } from '../../../lib/api.js';
import { calculatePayout } from '../data.js';

const ADMIN_TABS = ['Overview', 'Contests', 'Events', 'Submissions', 'Announcements', 'Tickets'];

export default function AdminTab() {
  const { user, role, loading: authLoading } = useAuth();

  const [activeTab,  setActiveTab]  = useState('Overview');
  const [loading,    setLoading]    = useState(false);

  const [contests,     setContests]     = useState([]);
  const [events,       setEvents]       = useState([]);
  const [submissions,  setSubmissions]  = useState([]);
  const [entries,      setEntries]      = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tickets,      setTickets]      = useState([]);

  const isAdmin = isCreatorAdmin(role);

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  useEffect(() => {
    if (!authLoading && isAdmin) loadAll();
  }, [authLoading, isAdmin]);

  async function loadAll() {
    setLoading(true);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [contResult, evResult, subResult] = await Promise.all([
        api('/api/admin/contests',     { headers }),
        api('/api/admin/events',       { headers }),
        api('/api/admin/submissions',  { headers }),
      ]);

      setContests(contResult.data || []);
      setEvents(evResult.data || []);
      setSubmissions(subResult.data?.submissions || []);
      setEntries(subResult.data?.contest_entries || []);

      // Announcements
      const annResult = await api('/api/announcements');
      setAnnouncements(annResult.data || []);

      // Tickets (free_tickets table)
      const { data: tix } = await supabase
        .from('free_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setTickets(tix || []);
    } catch (_) {}
    setLoading(false);
  }

  async function updateContestStatus(id, status) {
    try {
      const token = await getToken();
      await api(`/api/contests/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ status }),
      });
      loadAll();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  async function deleteEvent(id) {
    if (!confirm('Delete this event?')) return;
    try {
      const token = await getToken();
      await api(`/api/events/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadAll();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  // ── Not logged in ──
  if (authLoading) {
    return (
      <div className="hub-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="cinematic-spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="hub-content">
        <div className="admin-hub-gate">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡</div>
          <h2 className="admin-hub-gate__title">Creator Dashboard</h2>
          <p className="admin-hub-gate__sub">
            You must be signed in as a creator-admin to access this panel.
          </p>
          <Link to="/login" className="hub-btn hub-btn--gold" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center', width: '100%', padding: '0.65rem' }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="hub-content">
        <div className="admin-hub-gate">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔒</div>
          <h2 className="admin-hub-gate__title">Access Denied</h2>
          <p className="admin-hub-gate__sub">
            This panel is reserved for Studio Flow creator-admins.
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--hub-muted)', marginTop: '0.5rem' }}>
            Signed in as: {user.email}
          </p>
        </div>
      </div>
    );
  }

  // ── Stats ──
  const pendingSubs  = submissions.filter((s) => !s.status || s.status === 'pending').length;
  const activeEvents = events.filter((e) => e.status === 'upcoming' || !e.status).length;
  const totalVotes   = entries.reduce((sum, e) => sum + (e.vote_count || 0), 0);

  return (
    <div className="hub-content hub-content--wide">
      {/* Header */}
      <div className="admin-hub-header">
        <div>
          <p className="admin-hub-header__title">🛡 Creator Admin — {user.email?.split('@')[0]}</p>
          <p className="admin-hub-header__sub">Studio Flow Platform Management</p>
        </div>
        <Link to="/admin" style={{ textDecoration: 'none' }}>
          <button className="hub-btn hub-btn--ghost" style={{ fontSize: '0.8rem' }}>
            Full Admin Dashboard →
          </button>
        </Link>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--hub-border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab}
            className={`hub-tab${activeTab === tab ? ' hub-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Submissions' && pendingSubs > 0 && (
              <span style={{ marginLeft: '0.4rem', background: 'rgba(245,166,35,0.2)', color: '#f5a623', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem' }}>
                {pendingSubs}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="cinematic-spinner" />
        </div>
      ) : (
        <>
          {/* ── Overview ── */}
          {activeTab === 'Overview' && (
            <>
              <div className="admin-hub-overview">
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">{contests.length}</div><div className="admin-hub-stat__label">Contests</div></div>
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">{activeEvents}</div><div className="admin-hub-stat__label">Active Events</div></div>
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">{submissions.length}</div><div className="admin-hub-stat__label">Submissions</div></div>
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">{totalVotes}</div><div className="admin-hub-stat__label">Contest Votes</div></div>
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">{pendingSubs}</div><div className="admin-hub-stat__label">Pending Review</div></div>
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">{announcements.length}</div><div className="admin-hub-stat__label">Announcements</div></div>
              </div>

              {pendingSubs > 0 && (
                <>
                  <h2 className="hub-section-title" style={{ marginTop: '1.5rem' }}>⏳ Pending Submissions</h2>
                  {submissions.filter((s) => !s.status || s.status === 'pending').slice(0, 5).map((s) => (
                    <div key={s.id} className="ticket-item" style={{ marginBottom: '0.5rem' }}>
                      <div className="ticket-item__icon" style={{ background: 'rgba(245,166,35,0.1)', fontSize: '1rem' }}>📋</div>
                      <div className="ticket-item__body">
                        <p className="ticket-item__title">{s.user_name || 'Unnamed'}</p>
                        <p className="ticket-item__meta">{s.user_email} · {s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</p>
                      </div>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(245,166,35,0.15)', color: '#f5a623', border: '1px solid rgba(245,166,35,0.3)' }}>
                        pending
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop: '0.75rem' }}>
                    <button className="hub-btn hub-btn--ghost" style={{ fontSize: '0.82rem' }} onClick={() => setActiveTab('Submissions')}>
                      Review All Submissions →
                    </button>
                  </div>
                </>
              )}

              <h2 className="hub-section-title" style={{ marginTop: '1.5rem' }}>Quick Links</h2>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link to="/admin"              className="hub-btn hub-btn--ghost" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>🛡 Full Dashboard</Link>
                <Link to="/admin/event-requests" className="hub-btn hub-btn--ghost" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>🗂 Event Requests</Link>
                <Link to="/contests/create"    className="hub-btn hub-btn--ghost" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>🏆 Create Contest</Link>
                <Link to="/events/create"      className="hub-btn hub-btn--ghost" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>📡 Create Event</Link>
                <Link to="/announcements"      className="hub-btn hub-btn--ghost" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>📢 Announcements</Link>
              </div>
            </>
          )}

          {/* ── Contests ── */}
          {activeTab === 'Contests' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 className="hub-section-title" style={{ margin: 0 }}>All Contests ({contests.length})</h2>
                <Link to="/contests/create" className="hub-btn hub-btn--gold" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
                  + New Contest
                </Link>
              </div>
              {contests.length === 0 ? (
                <p style={{ color: 'var(--hub-muted)', textAlign: 'center', padding: '2rem' }}>No contests yet.</p>
              ) : (
                <div className="hub-table-wrap">
                  <table className="hub-table">
                    <thead>
                      <tr><th>Title</th><th>Status</th><th>Prize</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {contests.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <Link to={`/contests/${c.id}`} style={{ color: 'var(--hub-gold)', textDecoration: 'none' }}>{c.title}</Link>
                          </td>
                          <td><span className={`hub-badge hub-badge--${c.status || 'active'}`}>{c.status || 'active'}</span></td>
                          <td style={{ color: 'var(--hub-gold)', fontWeight: 700 }}>
                            {c.prize_pool > 0 ? `$${Number(c.prize_pool).toLocaleString()}` : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {c.status === 'draft'     && <button className="admin-action-btn" onClick={() => updateContestStatus(c.id, 'active')}>Publish</button>}
                              {c.status === 'active'    && <button className="admin-action-btn" onClick={() => updateContestStatus(c.id, 'voting')}>Open Voting</button>}
                              {c.status === 'voting'    && <button className="admin-action-btn" onClick={() => updateContestStatus(c.id, 'completed')}>End</button>}
                              <button className="admin-action-btn admin-action-btn--danger" onClick={() => updateContestStatus(c.id, 'archived')}>Archive</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Events ── */}
          {activeTab === 'Events' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 className="hub-section-title" style={{ margin: 0 }}>All Events ({events.length})</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to="/admin/event-requests" className="hub-btn hub-btn--ghost" style={{ textDecoration: 'none', fontSize: '0.82rem' }}>Requests</Link>
                  <Link to="/events/create"        className="hub-btn hub-btn--gold"  style={{ textDecoration: 'none', fontSize: '0.85rem' }}>+ New Event</Link>
                </div>
              </div>
              {events.length === 0 ? (
                <p style={{ color: 'var(--hub-muted)', textAlign: 'center', padding: '2rem' }}>No events yet.</p>
              ) : (
                <div className="hub-table-wrap">
                  <table className="hub-table">
                    <thead>
                      <tr><th>Title</th><th>Mode</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {events.map((ev) => {
                        const mode   = ev.event_mode || ev.event_type || '—';
                        const status = ev.status || 'upcoming';
                        return (
                          <tr key={ev.id}>
                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</td>
                            <td><span className={`hub-badge hub-badge--${mode || 'open'}`}>{mode || '—'}</span></td>
                            <td><span className={`hub-badge hub-badge--${status}`}>{status}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                <Link to={`/events/${ev.id}`} className="admin-action-btn" style={{ textDecoration: 'none' }}>View</Link>
                                <button className="admin-action-btn admin-action-btn--danger" onClick={() => deleteEvent(ev.id)}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Submissions ── */}
          {activeTab === 'Submissions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 className="hub-section-title" style={{ margin: 0 }}>
                  Event Slot Submissions
                  {pendingSubs > 0 && (
                    <span style={{ marginLeft: '0.5rem', background: 'rgba(245,166,35,0.2)', color: '#f5a623', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.5rem' }}>
                      {pendingSubs} pending
                    </span>
                  )}
                </h2>
                <Link to="/admin" className="hub-btn hub-btn--ghost" style={{ textDecoration: 'none', fontSize: '0.82rem' }}>Full Submissions View →</Link>
              </div>

              {submissions.length === 0 ? (
                <p style={{ color: 'var(--hub-muted)', textAlign: 'center', padding: '2rem' }}>No submissions yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '2rem' }}>
                  {submissions.map((s) => {
                    const status = s.status || 'pending';
                    const statusColor = { approved: '#22c55e', rejected: '#f87171', pending: '#f5a623' }[status] || '#8b9fc5';
                    return (
                      <div key={s.id} className="admin-submission-card">
                        <div className="admin-submission-body">
                          <p className="admin-submission-title">{s.user_name || 'Unnamed'}</p>
                          <p className="admin-submission-meta">{s.user_email}</p>
                          {s.description && <p style={{ fontSize: '0.8rem', opacity: 0.55, margin: '0.15rem 0 0' }}>{s.description}</p>}
                        </div>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}44`, whiteSpace: 'nowrap' }}>
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <h2 className="hub-section-title" style={{ marginTop: '0.5rem' }}>Contest Entries ({entries.length})</h2>
              {entries.length === 0 ? (
                <p style={{ color: 'var(--hub-muted)', fontSize: '0.85rem' }}>No contest entries yet.</p>
              ) : (
                <div className="hub-table-wrap">
                  <table className="hub-table">
                    <thead><tr><th>Entry</th><th>Contest</th><th>Votes</th><th>Status</th></tr></thead>
                    <tbody>
                      {entries.slice(0, 50).map((e) => (
                        <tr key={e.id}>
                          <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title || e.submitter_email || '—'}</td>
                          <td style={{ color: 'var(--hub-muted)', fontSize: '0.82rem' }}>{e.contests?.title || '—'}</td>
                          <td style={{ fontWeight: 700, color: 'var(--hub-gold)' }}>{e.vote_count || 0}</td>
                          <td><span className={`hub-badge hub-badge--${e.is_winner ? 'active' : 'open'}`}>{e.is_winner ? '🏆 Winner' : 'Entered'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Announcements ── */}
          {activeTab === 'Announcements' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 className="hub-section-title" style={{ margin: 0 }}>Announcements ({announcements.length})</h2>
                <Link to="/announcements" className="hub-btn hub-btn--gold" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
                  Manage Announcements →
                </Link>
              </div>
              {announcements.length === 0 ? (
                <p style={{ color: 'var(--hub-muted)', textAlign: 'center', padding: '2rem' }}>No announcements yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {announcements.map((a) => (
                    <div key={a.id} style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: a.pinned ? 'rgba(245,166,35,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${a.pinned ? 'rgba(245,166,35,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                        {a.pinned && <span style={{ fontSize: '0.75rem' }}>📌</span>}
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.title}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(200,200,215,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tickets ── */}
          {activeTab === 'Tickets' && (
            <div>
              <h2 className="hub-section-title" style={{ marginBottom: '1rem' }}>Free Tickets Issued ({tickets.length})</h2>
              {tickets.length === 0 ? (
                <p style={{ color: 'var(--hub-muted)', textAlign: 'center', padding: '2rem' }}>No tickets issued yet.</p>
              ) : (
                <div className="hub-table-wrap">
                  <table className="hub-table">
                    <thead>
                      <tr><th>Event ID</th><th>User ID</th><th>Type</th><th>Issued</th></tr>
                    </thead>
                    <tbody>
                      {tickets.slice(0, 100).map((t) => (
                        <tr key={t.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{t.event_id?.slice(0, 8)}…</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{t.user_id?.slice(0, 8)}…</td>
                          <td><span className="hub-badge hub-badge--open">{t.ticket_type || 'view_only'}</span></td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--hub-muted)' }}>
                            {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
