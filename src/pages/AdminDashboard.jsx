import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import '../styles/admin.css';

const TABS = ['Overview', 'Contests', 'Events', 'Submissions', 'Tickets', 'Moderation'];

export default function AdminDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');

  // Data
  const [contests,    setContests]    = useState([]);
  const [events,      setEvents]      = useState([]);
  const [tickets,     setTickets]     = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [stats,       setStats]       = useState({ contests:0, events:0, tickets:0, revenue:0, submissions:0 });
  const [loading,     setLoading]     = useState(true);

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
      { data: t },
      { data: s },
    ] = await Promise.all([
      supabase.from('contests').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('events').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('event_tickets').select('*, events(title, ticket_price)').order('created_at', { ascending: false }).limit(100),
      supabase.from('contest_entries').select('*, contests(title)').order('created_at', { ascending: false }).limit(100),
    ]);

    const revenue = (t || []).reduce((sum, tk) => sum + Number(tk.events?.ticket_price || 0), 0);

    setContests(c || []);
    setEvents(e || []);
    setTickets(t || []);
    setSubmissions(s || []);
    setStats({
      contests:    (c || []).length,
      events:      (e || []).length,
      tickets:     (t || []).length,
      revenue,
      submissions: (s || []).length,
    });
    setLoading(false);
  }

  async function updateContestStatus(id, status) {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/contests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ status }),
    });
    loadAll();
  }

  if (authLoading || loading) return (
    <div className="page-container" style={{ textAlign:'center', paddingTop:'4rem' }}>
      <div className="cinematic-spinner" />
    </div>
  );

  return (
    <div className="page-container page-container--wide">
      <div className="page-header">
        <div style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.5rem' }}>
          <span style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#f2c98f', background:'rgba(242,201,143,0.1)', border:'1px solid rgba(242,201,143,0.25)', borderRadius:'4px', padding:'0.2rem 0.55rem' }}>
            🛡 Admin
          </span>
        </div>
        <h1 className="page-title">Studio Flow Admin</h1>
        <p className="page-subtitle">Platform management for Michael Vandeventer</p>
      </div>

      {/* Stats overview */}
      <div className="admin-stats" style={{ marginBottom:'1.5rem' }}>
        <div className="admin-stat-card admin-stat-card--gold">
          <div className="admin-stat-value">${stats.revenue.toLocaleString()}</div>
          <div className="admin-stat-label">Total Revenue</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.tickets}</div>
          <div className="admin-stat-label">Tickets Sold</div>
        </div>
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
          <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
            <div className="admin-section-header">
              <h2 className="admin-section-title">Recent Activity</h2>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
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
          </div>
        )}

        {/* ── Contests ── */}
        {activeTab === 'Contests' && (
          <div>
            <div className="admin-section-header">
              <h2 className="admin-section-title">All Contests</h2>
              <Link to="/contests/create" className="btn btn--primary" style={{ textDecoration:'none' }}>
                + Create
              </Link>
            </div>
            {contests.length === 0
              ? <p className="admin-empty">No contests yet.</p>
              : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th><th>Status</th><th>Prize</th><th>Entries</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contests.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <Link to={`/contests/${c.id}`} style={{ color:'var(--accent-blue)', textDecoration:'none' }}>
                              {c.title}
                            </Link>
                          </td>
                          <td><span className={`admin-badge admin-badge--${c.status}`}>{c.status}</span></td>
                          <td>{c.prize_pool > 0 ? `$${Number(c.prize_pool).toLocaleString()}` : '—'}</td>
                          <td>—</td>
                          <td style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                            {c.status === 'draft'  && <button className="admin-action-btn" onClick={() => updateContestStatus(c.id,'active')}>Publish</button>}
                            {c.status === 'active' && <button className="admin-action-btn" onClick={() => updateContestStatus(c.id,'voting')}>Start Voting</button>}
                            {c.status === 'voting' && <button className="admin-action-btn" onClick={() => updateContestStatus(c.id,'completed')}>End Voting</button>}
                            <button className="admin-action-btn admin-action-btn--danger" onClick={() => updateContestStatus(c.id,'archived')}>Archive</button>
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
              <Link to="/events/create" className="btn btn--primary" style={{ textDecoration:'none' }}>+ Create</Link>
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
                              <Link to={`/stage/${ev.stage_room_id}`} className="admin-action-btn" style={{ textDecoration:'none' }}>
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
            <h2 className="admin-section-title" style={{ marginBottom:'1rem' }}>Contest Submissions</h2>
            {submissions.length === 0
              ? <p className="admin-empty">No submissions yet.</p>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
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
                        {s.description && <p style={{ fontSize:'0.82rem', opacity:0.6, margin:'0.25rem 0 0' }}>{s.description}</p>}
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

        {/* ── Tickets ── */}
        {activeTab === 'Tickets' && (
          <div>
            <h2 className="admin-section-title" style={{ marginBottom:'1rem' }}>Ticket Sales</h2>
            {tickets.length === 0
              ? <p className="admin-empty">No tickets sold yet.</p>
              : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Event</th><th>Price</th><th>Issued</th><th>Payment Ref</th></tr>
                    </thead>
                    <tbody>
                      {tickets.map((tk) => (
                        <tr key={tk.id}>
                          <td>{tk.events?.title || '—'}</td>
                          <td>{tk.events?.ticket_price > 0 ? `$${tk.events.ticket_price}` : 'Free'}</td>
                          <td style={{ fontSize:'0.8rem', opacity:0.6 }}>
                            {tk.created_at ? formatDistanceToNow(new Date(tk.created_at), { addSuffix: true }) : '—'}
                          </td>
                          <td style={{ fontSize:'0.78rem', opacity:0.5 }}>{tk.payment_reference || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        )}

        {/* ── Moderation ── */}
        {activeTab === 'Moderation' && (
          <div>
            <h2 className="admin-section-title" style={{ marginBottom:'1rem' }}>Moderation Tools</h2>
            <p style={{ color:'rgba(200,200,215,0.5)', fontSize:'0.9rem' }}>
              Moderation tools including content removal, user management, and abuse reports will be added here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
