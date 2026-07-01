import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';
import { supabase } from '../lib/supabaseClient';
import { formatDistanceToNow, format } from 'date-fns';
import '../styles/admin.css';
import { api } from '../lib/api.js';
import AdminPayoutPanel       from '../components/admin/AdminPayoutPanel';        // ← NEW
import AdminRevenueTallyCards from '../components/admin/AdminRevenueTallyCards';   // ← NEW
import { REVENUE_CONFIG as RC } from '../config/revenueConfig';

const TABS = ['Overview', 'Contests', 'Submissions', 'Announcements', 'Payouts', 'Moderation'];

// Build last-6-months subscription activity from profiles rows
function buildMonthlyHistory(rows) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), newSubs: 0, cancelled: 0 });
  }
  const monthMap = Object.fromEntries(months.map((m) => [m.key, m]));
  for (const row of rows) {
    if (row.started_at) {
      const k = row.started_at.slice(0, 7);
      if (monthMap[k]) monthMap[k].newSubs++;
    }
    if (row.is_active === false && row.updated_at) {
      const k = row.updated_at.slice(0, 7);
      if (monthMap[k]) monthMap[k].cancelled++;
    }
  }
  return months;
}

export default function AdminDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [contests, setContests] = useState([]);
  const [contestDash, setContestDash] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [genSubmissions, setGenSubmissions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({ contests: 0, submissions: 0, announcements: 0 });
  const [loading, setLoading] = useState(true);

  // Live counts
  const [eventRequests, setEventRequests] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);

  // Editable subscriber override
  const [editingSubCount, setEditingSubCount] = useState(false);
  const [subCountInput, setSubCountInput] = useState('');

  // Monthly subscription history (last 6 months)
  const [subHistory, setSubHistory] = useState([]);

  // Membership tier breakdown
  const [tierCounts, setTierCounts] = useState({ founding: 0, standard: 0 });

  // Announcement form
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [editingAnn, setEditingAnn] = useState(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPinned, setAnnPinned] = useState(false);
  const [annSaving, setAnnSaving] = useState(false);
  const [annError, setAnnError] = useState('');

  // Submission approval modal
  const [approvingSubmission, setApprovingSubmission] = useState(null);
  const [slotTitle, setSlotTitle] = useState('');
  const [slotPassword, setSlotPassword] = useState('');
  const [approvalSaving, setApprovalSaving] = useState(false);
  const [approvalError, setApprovalError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isCreatorAdmin(role)) { navigate('/'); return; }
    loadAll();
  }, [authLoading, role, navigate]);

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  // ── Realtime: increment counts live ──────────────────────────────────────
  useEffect(() => {
    if (authLoading || !isCreatorAdmin(role)) return;

    const entriesCh = supabase
      .channel('admin-entries-watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, () => {
        setStats((prev) => ({ ...prev, submissions: prev.submissions + 1 }));
      })
      .subscribe();

    const profilesCh = supabase
      .channel('admin-profiles-watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        setMemberCount((prev) => prev + 1);
      })
      .subscribe();

    const subscribersCh = supabase
      .channel('admin-subscribers-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, async () => {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('subscription_active', true);
        if (count !== null) {
          setSubscriberCount(count);
          if (localStorage.getItem('admin_subscriber_count') !== null) {
            localStorage.setItem('admin_subscriber_count', String(count));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(entriesCh);
      supabase.removeChannel(profilesCh);
      supabase.removeChannel(subscribersCh);
    };
  }, [authLoading, role]);

  // ── Subscriber count override ─────────────────────────────────────────────
  function startEditSubCount() { setSubCountInput(String(subscriberCount)); setEditingSubCount(true); }
  function saveSubCount() {
    const n = parseInt(subCountInput, 10);
    if (!isNaN(n) && n >= 0) { setSubscriberCount(n); localStorage.setItem('admin_subscriber_count', String(n)); }
    setEditingSubCount(false);
  }
  function resetSubCount() { localStorage.removeItem('admin_subscriber_count'); loadAll(); setEditingSubCount(false); }

  async function loadAll() {
    setLoading(true);
    let c = [], s = [], anns = [], genSubs = [];
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [contestsJson, adminSubsJson, annJson, genSubJson, countsJson, histJson] =
        await Promise.allSettled([
          api('/api/admin/contests',              { headers }),
          api('/api/admin/submissions',           { headers }),
          api('/api/announcements',               { headers }),
          api('/api/submissions',                 { headers }),
          api('/api/admin/counts',                { headers }),
          api('/api/admin/subscription-history',  { headers }),
        ]);

      c       = contestsJson.status  === 'fulfilled' ? (contestsJson.value.data || [])                      : [];
      s       = adminSubsJson.status === 'fulfilled' ? (adminSubsJson.value.data?.submissions || [])        : [];
      anns    = annJson.status       === 'fulfilled' ? (annJson.value.data || [])                           : [];
      genSubs = genSubJson.status    === 'fulfilled' ? (Array.isArray(genSubJson.value) ? genSubJson.value : []) : [];

      if (countsJson.status === 'fulfilled') {
        const counts = countsJson.value;
        setEventRequests(counts.event_requests ?? 0);
        setMemberCount(counts.total_members ?? 0);
        const liveSubCount = counts.subscribers ?? 0;
        const storedSub = localStorage.getItem('admin_subscriber_count');
        setSubscriberCount(storedSub !== null ? Number(storedSub) : liveSubCount);
      }

      if (histJson.status === 'fulfilled') {
        const profileRows = histJson.value.data || [];
        const mappedRows  = profileRows.map((p) => ({
          started_at: p.subscription_active ? p.updated_at : null,
          is_active:  p.subscription_active,
          updated_at: p.updated_at,
        }));
        setSubHistory(buildMonthlyHistory(mappedRows));
      } else {
        setSubHistory(buildMonthlyHistory([]));
      }
    } catch (err) {
      console.warn('[AdminDashboard] loadAll error:', err?.message);
    }

    // Membership tier breakdown
    try {
      const { data: tierData } = await supabase
        .from('profiles')
        .select('membership_tier')
        .not('membership_tier', 'is', null);
      if (tierData) {
        setTierCounts({
          founding: tierData.filter((p) => p.membership_tier === 'founding').length,
          standard: tierData.filter((p) => p.membership_tier === 'premier').length,
        });
      }
    } catch (_) {}

    setContests(c);
    setContestDash([]);
    setSubmissions(s);
    setGenSubmissions(genSubs);
    setAnnouncements(anns);
    setStats({ contests: c.length, submissions: s.length, announcements: anns.length });
    setLoading(false);
  }

  async function updateContestStatus(id, status) {
    const token = await getToken();
    await api(`/api/contests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    loadAll();
  }

  async function triggerPayout(contestId) {
    if (!confirm('Trigger payout for all marked winners? This will record earnings in their accounts.')) return;
    try {
      const token = await getToken();
      const result = await api(`/api/contests/${contestId}/payout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`Payout recorded: ${result.winners} winner(s), $${result.prizeShare} each.`);
      loadAll();
    } catch (err) {
      alert(`Payout error: ${err.message}`);
    }
  }

  // ── Announcements ──────────────────────────────────────────────────────────
  async function saveAnnouncement() {
    if (!annTitle.trim() || !annBody.trim()) { setAnnError('Title and body required.'); return; }
    setAnnSaving(true); setAnnError('');
    try {
      const token  = await getToken();
      const path   = editingAnn ? `/api/announcements/${editingAnn.id}` : '/api/announcements';
      const method = editingAnn ? 'PATCH' : 'POST';
      await api(path, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: annTitle, body: annBody, pinned: annPinned }),
      });
      resetAnnForm(); loadAll();
    } catch (err) { setAnnError(err.message); }
    finally { setAnnSaving(false); }
  }

  async function deleteAnnouncement(id) {
    if (!confirm('Delete this announcement?')) return;
    const token = await getToken();
    await api(`/api/announcements/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadAll();
  }

  function startEditAnn(a) {
    setEditingAnn(a); setAnnTitle(a.title); setAnnBody(a.body);
    setAnnPinned(a.pinned || false); setShowAnnForm(true);
  }
  function resetAnnForm() {
    setShowAnnForm(false); setEditingAnn(null);
    setAnnTitle(''); setAnnBody(''); setAnnPinned(false); setAnnError('');
  }

  // ── Submission approval ────────────────────────────────────────────────────
  function openApproveModal(sub) {
    setApprovingSubmission(sub); setSlotTitle(sub.title || sub.user_name || '');
    setSlotPassword(''); setApprovalError('');
  }
  function closeApproveModal() {
    setApprovingSubmission(null); setSlotTitle(''); setSlotPassword(''); setApprovalError('');
  }
  async function approveSubmission() {
    if (!slotTitle.trim() || !slotPassword.trim()) { setApprovalError('Slot title and password are required.'); return; }
    setApprovalSaving(true); setApprovalError('');
    try {
      const token = await getToken();
      await api('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          submission_id: approvingSubmission.id,
          user_id:       approvingSubmission.user_id,
          title:         slotTitle.trim(),
          password:      slotPassword.trim(),
        }),
      });
      closeApproveModal(); loadAll();
    } catch (err) { setApprovalError(err.message); }
    finally { setApprovalSaving(false); }
  }
  async function rejectSubmission(id) {
    const reason = prompt('Optional rejection reason (leave blank to skip):');
    if (reason === null) return;
    try {
      const token = await getToken();
      await api('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ submission_id: id, reason: reason.trim() || undefined }),
      });
      loadAll();
    } catch (err) { alert(`Reject error: ${err.message}`); }
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

      {/* ── Stats ── */}
      <div className="admin-stats" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-stat-card admin-stat-card--green">
          <div className="admin-stat-value">{stats.submissions}</div>
          <div className="admin-stat-label">Contest Entries</div>
        </div>
        <div className="admin-stat-card admin-stat-card--blue">
          <div className="admin-stat-value">{memberCount}</div>
          <div className="admin-stat-label">Members</div>
        </div>
        <div className="admin-stat-card" style={{ position: 'relative' }}>
          {editingSubCount ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
              <input
                type="number" min="0" value={subCountInput}
                onChange={(e) => setSubCountInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveSubCount(); if (e.key === 'Escape') setEditingSubCount(false); }}
                autoFocus
                style={{ width: '80px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '0.25rem 0.4rem', color: '#fff', fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}
              />
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={saveSubCount} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(134,239,172,0.15)', border: '1px solid rgba(134,239,172,0.3)', color: '#86efac', cursor: 'pointer' }}>Save</button>
                <button onClick={resetSubCount} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(200,200,215,0.5)', cursor: 'pointer' }}>Live</button>
              </div>
            </div>
          ) : (
            <>
              <div className="admin-stat-value" style={{ color: '#c084fc' }}>{subscriberCount}</div>
              <div className="admin-stat-label">
                Subscribers
                <button onClick={startEditSubCount} title="Override subscriber count" style={{ marginLeft: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)', verticalAlign: 'middle', padding: 0 }}>✏️</button>
              </div>
            </>
          )}
        </div>
        <div className="admin-stat-card admin-stat-card--blue">
          <div className="admin-stat-value">{stats.contests}</div>
          <div className="admin-stat-label">Contests</div>
        </div>
        <div className="admin-stat-card admin-stat-card--gold">
          <div className="admin-stat-value">{stats.announcements}</div>
          <div className="admin-stat-label">Announcements</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button key={tab} className={`admin-tab${activeTab === tab ? ' admin-tab--active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      <div className="admin-panel">

        {/* ── Overview ── */}
        {activeTab === 'Overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Revenue Tally */}
            <AdminRevenueTallyCards /> {/* ← NEW */}

            {/* Subscription Activity */}
            <div>
              <div className="admin-section-header" style={{ marginBottom: '0.75rem' }}>
                <h2 className="admin-section-title">Subscription Activity</h2>
                <span style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.4)' }}>last 6 months · auto-updates on payment &amp; cancellation</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <th style={{ textAlign: 'left',   padding: '0.4rem 0.75rem', color: 'rgba(200,200,215,0.45)', fontWeight: 600 }}>Month</th>
                      <th style={{ textAlign: 'center', padding: '0.4rem 0.75rem', color: 'rgba(200,200,215,0.45)', fontWeight: 600 }}>New</th>
                      <th style={{ textAlign: 'center', padding: '0.4rem 0.75rem', color: 'rgba(200,200,215,0.45)', fontWeight: 600 }}>Cancelled / Lapsed</th>
                      <th style={{ textAlign: 'center', padding: '0.4rem 0.75rem', color: 'rgba(200,200,215,0.45)', fontWeight: 600 }}>Net</th>
                      <th style={{ textAlign: 'left',   padding: '0.4rem 0.75rem', color: 'rgba(200,200,215,0.45)', fontWeight: 600 }}>Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subHistory.map((row, i) => {
                      const net      = row.newSubs - row.cancelled;
                      const isLatest = i === subHistory.length - 1;
                      const barMax   = Math.max(...subHistory.map((r) => r.newSubs), 1);
                      const barWidth = Math.round((row.newSubs / barMax) * 100);
                      return (
                        <tr key={row.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isLatest ? 'rgba(192,132,252,0.04)' : 'transparent' }}>
                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: isLatest ? 700 : 400, color: isLatest ? '#c084fc' : 'inherit' }}>
                            {row.label}{isLatest ? ' ●' : ''}
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: '#86efac', fontWeight: 600 }}>
                            {row.newSubs > 0 ? `+${row.newSubs}` : '—'}
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: row.cancelled > 0 ? '#f87171' : 'rgba(200,200,215,0.3)' }}>
                            {row.cancelled > 0 ? `-${row.cancelled}` : '—'}
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: net > 0 ? '#86efac' : net < 0 ? '#f87171' : 'rgba(200,200,215,0.4)', fontWeight: 600 }}>
                            {net > 0 ? `+${net}` : net === 0 ? '0' : net}
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', minWidth: '100px' }}>
                            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${barWidth}%`, borderRadius: '3px', background: 'linear-gradient(90deg, #c084fc, #818cf8)', transition: 'width 0.4s ease' }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {subHistory.every((r) => r.newSubs === 0 && r.cancelled === 0) && (
                  <p className="admin-empty" style={{ marginTop: '0.5rem' }}>No subscription activity yet — data appears here once Stripe payments start flowing.</p>
                )}
              </div>
            </div>

            {/* Membership Tier Breakdown */}
            <div>
              <div className="admin-section-header" style={{ marginBottom: '0.75rem' }}>
                <h2 className="admin-section-title">Membership Tiers</h2>
              </div>
              <div className="membership-stats" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="stat" style={{ flex: 1, minWidth: '140px', background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(200,200,215,0.5)' }}>Founding Members ($25/mo)</h3>
                  <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-gold, #f5a623)' }}>{tierCounts.founding}</p>
                </div>
                <div className="stat" style={{ flex: 1, minWidth: '140px', background: 'rgba(192,132,252,0.07)', border: '1px solid rgba(192,132,252,0.2)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(200,200,215,0.5)' }}>Premier Members ($40/mo)</h3>
                  <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#c084fc' }}>{tierCounts.standard}</p>
                </div>
                <div className="stat" style={{ flex: 1, minWidth: '140px', background: 'rgba(134,239,172,0.07)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(200,200,215,0.5)' }}>Total Members</h3>
                  <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#86efac' }}>{tierCounts.founding + tierCounts.standard}</p>
                </div>
              </div>
            </div>

            {/* ── Monthly Profit Calculator ── */}
            {(() => {
              const foundingMembers  = tierCounts.founding;
              const standardMembers  = tierCounts.standard;
              const totalMembers     = foundingMembers + standardMembers;

              const totalRevenue  = (foundingMembers * RC.founding.price)
                                  + (standardMembers * RC.standard.price);
              const contestPool   = (foundingMembers * RC.founding.contestPool)
                                  + (standardMembers * RC.standard.contestPool);
              const myProfit      = (foundingMembers * RC.founding.myProfit)
                                  + (standardMembers * RC.standard.myProfit);
              return (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem' }}>
                  <h2 className="admin-section-title" style={{ marginBottom: '1rem' }}>💰 My Monthly Profit</h2>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.875rem', marginBottom: '1rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', color: 'rgba(200,200,215,0.5)' }}>Total Members</p>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>{totalMembers}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(200,200,215,0.35)' }}>
                        {foundingMembers} founding · {standardMembers} premier
                      </p>
                    </div>

                    <div style={{ background: 'rgba(134,239,172,0.06)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', color: 'rgba(200,200,215,0.5)' }}>Gross Revenue</p>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: 800, color: '#86efac' }}>${totalRevenue.toFixed(2)}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(200,200,215,0.35)' }}>this month</p>
                    </div>

                    <div style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', color: 'rgba(200,200,215,0.5)' }}>Pool Allocations</p>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-gold, #f5a623)' }}>-${contestPool.toFixed(2)}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(200,200,215,0.35)' }}>contest pool only</p>
                    </div>

                    <div style={{ background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', color: 'rgba(192,132,252,0.7)' }}>My Profit</p>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>${myProfit.toFixed(2)}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(192,132,252,0.5)' }}>after pool deductions</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', fontSize: '0.82rem', color: 'rgba(200,200,215,0.5)', marginBottom: '0.75rem' }}>
                    <p style={{ margin: 0 }}>🏆 Contest Pool: <span style={{ color: '#fff', fontWeight: 600 }}>${contestPool.toFixed(2)}</span></p>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', fontSize: '0.75rem', color: 'rgba(200,200,215,0.4)' }}>
                    <p style={{ margin: 0 }}>
                      Founding ({foundingMembers} × $25): $15/member → <span style={{ color: '#fff' }}>${(foundingMembers * RC.founding.myProfit).toFixed(2)}</span>
                    </p>
                    <p style={{ margin: 0 }}>
                      Premier ({standardMembers} × $40): $25/member → <span style={{ color: '#fff' }}>${(standardMembers * RC.standard.myProfit).toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Recent Contest Entries */}
            <div className="admin-section-header">
              <h2 className="admin-section-title">Recent Contest Entries</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {submissions.slice(0, 5).map((s) => (
                <div key={s.id} className="admin-submission-card">
                  <div className="admin-submission-body">
                    <p className="admin-submission-title">{s.title}</p>
                    <p className="admin-submission-meta">
                      Contest: {s.contests?.title || '—'} · {s.created_at ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true }) : ''}
                    </p>
                  </div>
                  {s.media_url && (
                    <a href={s.media_url} target="_blank" rel="noopener noreferrer" className="admin-action-btn">View File</a>
                  )}
                </div>
              ))}
              {submissions.length === 0 && <p className="admin-empty">No contest entries yet.</p>}
            </div>

            {genSubmissions.filter((s) => s.status === 'pending').length > 0 && (
              <>
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Pending Submissions</h2>
                  <button className="admin-action-btn" onClick={() => setActiveTab('Submissions')}>Review All</button>
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
                  <button className="admin-action-btn" onClick={() => setActiveTab('Announcements')}>Manage</button>
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
              <Link to="/contests/create" className="btn btn--primary" style={{ textDecoration: 'none' }}>+ Create</Link>
            </div>
            {contests.length === 0 ? <p className="admin-empty">No contests yet.</p> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Title</th><th>Category</th><th>Prize</th><th>Submissions</th><th>Likes</th><th>Actions</th></tr></thead>
                  <tbody>
                    {contests.map((c) => {
                      const dash     = contestDash.find(d => d.contest_id === c.id || d.id === c.id);
                      const subCount = dash?.submission_count ?? submissions.filter((s) => s.contest_id === c.id).length;
                      const likeCount = dash?.total_like_count ?? '—';
                      return (
                        <tr key={c.id}>
                          <td>
                            <Link to={`/contests/${c.id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>{c.title}</Link>
                            {c.status === 'draft' && <span style={{ marginLeft: '0.5rem', fontSize: '0.68rem', color: 'rgba(200,200,215,0.4)', fontStyle: 'italic' }}>draft</span>}
                          </td>
                          <td style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.82rem' }}>{c.category || '—'}</td>
                          <td>{c.prize_pool > 0 ? `$${Number(c.prize_pool).toLocaleString()}` : '—'}</td>
                          <td style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.82rem' }}>{subCount}</td>
                          <td style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.82rem' }}>{likeCount}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {c.status === 'draft' && <button className="admin-action-btn" onClick={() => updateContestStatus(c.id, 'active')}>Publish</button>}
                              {c.prize_pool > 0 && (
                                <button className="admin-action-btn" style={{ borderColor: 'rgba(134,239,172,0.3)', color: '#86efac' }} onClick={() => triggerPayout(c.id)}>Payout Winners</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.35)', marginTop: '0.75rem' }}>
              To mark winners on a contest, open the contest detail page and use the admin winner controls.
            </p>
          </div>
        )}

        {/* ── Submissions ── */}
        {activeTab === 'Submissions' && (
          <div>
            {approvingSubmission && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                <div style={{ background: '#111d33', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '18px', padding: '2rem', maxWidth: '440px', width: '100%' }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontWeight: 700 }}>Approve Submission</h3>
                  <p style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
                    Create an event slot for <strong>{approvingSubmission.user_name}</strong>. They will receive the slot title and upload password by email.
                  </p>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'rgba(255,255,255,0.75)' }}>Slot Title</label>
                  <input value={slotTitle} onChange={(e) => setSlotTitle(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.875rem', color: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} disabled={approvalSaving} />
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.75rem' }}>Upload Password</label>
                  <input value={slotPassword} onChange={(e) => setSlotPassword(e.target.value)} placeholder="e.g. studioflow-abc123" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.875rem', color: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} disabled={approvalSaving} />
                  {approvalError && <p style={{ color: '#fca5a5', fontSize: '0.83rem', marginTop: '0.5rem' }}>{approvalError}</p>}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                    <button onClick={approveSubmission} disabled={approvalSaving} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: approvalSaving ? 'not-allowed' : 'pointer', border: 'none', background: approvalSaving ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                      {approvalSaving ? 'Creating Slot…' : 'Approve & Create Slot'}
                    </button>
                    <button onClick={closeApproveModal} style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
            <div className="admin-section-header">
              <h2 className="admin-section-title">Video Generator Submissions</h2>
              <span style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.4)' }}>{genSubmissions.filter((s) => !s.status || s.status === 'pending').length} pending</span>
            </div>
            {genSubmissions.length === 0 ? <p className="admin-empty">No submissions yet.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '2rem' }}>
                {genSubmissions.map((s) => {
                  const status      = s.status || 'pending';
                  const statusColor = { approved: '#22c55e', rejected: '#f87171', pending: '#f5a623' }[status] || '#8b9fc5';
                  return (
                    <div key={s.id} className="admin-submission-card">
                      <div className="admin-submission-body">
                        <p className="admin-submission-title">{s.user_name || 'Unnamed'}</p>
                        <p className="admin-submission-meta">{s.user_email} · {s.created_at ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true }) : ''}</p>
                        {s.description && <p style={{ fontSize: '0.8rem', opacity: 0.55, margin: '0.2rem 0 0' }}>{s.description}</p>}
                        {s.media_url && <a href={s.media_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.77rem', color: 'var(--accent-blue)', marginTop: '0.25rem', display: 'inline-block' }}>View Media →</a>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}44` }}>{status}</span>
                        {status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button className="admin-action-btn" style={{ borderColor: 'rgba(34,197,94,0.3)', color: '#86efac' }} onClick={() => openApproveModal(s)}>Approve</button>
                            <button className="admin-action-btn admin-action-btn--danger" onClick={() => rejectSubmission(s.id)}>Reject</button>
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
            {submissions.length === 0 ? <p className="admin-empty">No contest entries yet.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {submissions.map((s) => (
                  <div key={s.id} className="admin-submission-card">
                    {s.media_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(s.media_url) && <img src={s.media_url} alt={s.title} className="admin-submission-thumb" />}
                    <div className="admin-submission-body">
                      <p className="admin-submission-title">{s.title}</p>
                      <p className="admin-submission-meta">{s.contests?.title || 'Unknown contest'} · {s.user_email || '—'} · {s.created_at ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true }) : ''}</p>
                      {s.description && <p style={{ fontSize: '0.82rem', opacity: 0.6, margin: '0.25rem 0 0' }}>{s.description}</p>}
                    </div>
                    {s.media_url && <a href={s.media_url} target="_blank" rel="noopener noreferrer" className="admin-action-btn">View</a>}
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
              {!showAnnForm && <button className="btn btn--primary" onClick={() => setShowAnnForm(true)}>+ New</button>}
            </div>
            {showAnnForm && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>{editingAnn ? 'Edit Announcement' : 'New Announcement'}</h3>
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
                  <button className="btn btn--primary" onClick={saveAnnouncement} disabled={annSaving}>{annSaving ? 'Saving…' : editingAnn ? 'Save' : 'Publish'}</button>
                </div>
              </div>
            )}
            {announcements.length === 0 && !showAnnForm && <p className="admin-empty">No announcements yet.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {announcements.map((a) => (
                <div key={a.id} style={{ background: a.pinned ? 'rgba(245,166,35,0.06)' : 'rgba(255,255,255,0.025)', border: `1px solid ${a.pinned ? 'rgba(245,166,35,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      {a.pinned && <span style={{ fontSize: '0.72rem' }}>📌</span>}
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.title}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(200,200,215,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.body}</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.73rem', color: 'rgba(200,200,215,0.35)' }}>{a.created_at ? format(new Date(a.created_at), 'MMM d, yyyy') : ''}</p>
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

        {/* ── Payouts ── */}   {/* ← NEW TAB */}
        {activeTab === 'Payouts' && (
          <div>
            <div className="admin-section-header" style={{ marginBottom: '0.5rem' }}>
              <h2 className="admin-section-title">Creator Payouts</h2>
            </div>
            <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              All creators with a saved payout method. Stripe Connect creators are paid automatically — PayPal, Venmo, and CashApp require manual transfer then click Mark Paid.
            </p>
            <AdminPayoutPanel />
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

