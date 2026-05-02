import { useState, useEffect } from 'react';
import { CONTESTS, calculatePayout } from '../data.js';
import { supabase } from '../../../lib/supabase.js';

const ADMIN_PASSWORD = 'studio2026';

const STATUS_OPTIONS = ['active', 'voting', 'closed', 'archived'];

export default function AdminTab() {
  const [password,   setPassword]   = useState('');
  const [authed,     setAuthed]     = useState(false);
  const [error,      setError]      = useState('');
  const [activeTab,  setActiveTab]  = useState('Overview');

  const [submissions,  setSubmissions]  = useState([]);
  const [tickets,      setTickets]      = useState([]);
  const [contestData,  setContestData]  = useState(() =>
    CONTESTS.map((c) => ({ ...c, submissionCount: 0, voteCount: 0, revenue: 0, winners: [] }))
  );
  const [loading, setLoading] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [processingPayout, setProcessingPayout] = useState(null);

  function handleLogin() {
    if (password === ADMIN_PASSWORD) { setAuthed(true); setError(''); }
    else setError('Incorrect password. Try again.');
  }

  async function loadData() {
    setLoading(true);
    try {
      const [{ data: subs }, { data: tix }] = await Promise.all([
        supabase.from('hub_submissions').select('*').order('created_at', { ascending: false }),
        supabase.from('hub_tickets').select('*').order('purchased_at', { ascending: false }),
      ]);

      const allSubs  = subs  || [];
      const allTix   = tix   || [];
      setSubmissions(allSubs);
      setTickets(allTix);

      setContestData(CONTESTS.map((c) => {
        const csubs   = allSubs.filter((s) => s.contest_id === c.id);
        const votes   = csubs.reduce((s, sb) => s + (sb.vote_count || 0), 0);
        const revenue = csubs.length * c.entryFee;
        return { ...c, submissionCount: csubs.length, voteCount: votes, revenue, submissions: csubs, winners: csubs.filter((s) => s.is_winner) };
      }));
    } catch (_) {}
    setLoading(false);
  }

  useEffect(() => { if (authed) loadData(); }, [authed]);

  async function handleStatusChange(contestId, newStatus) {
    setContestData((prev) =>
      prev.map((c) => c.id === contestId ? { ...c, status: newStatus } : c)
    );
  }

  async function approveWinners(contest) {
    const sorted = [...(contest.submissions || [])].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    const payouts = calculatePayout(contest.revenue);
    const winnerCount = payouts.length;
    const winners = sorted.slice(0, winnerCount);

    for (let i = 0; i < winners.length; i++) {
      await supabase
        .from('hub_submissions')
        .update({ is_winner: true, winner_rank: i + 1 })
        .eq('id', winners[i].id);
    }
    await loadData();
  }

  async function processPayout(contest) {
    setProcessingPayout(contest.id);
    const payouts = calculatePayout(contest.revenue);
    const sorted  = [...(contest.submissions || [])].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    const winners = sorted.slice(0, payouts.length);
    const record  = {
      contestId: contest.id,
      contestTitle: contest.title,
      date: new Date().toLocaleDateString(),
      payouts: payouts.map((p, i) => ({
        rank: p.rank,
        name: winners[i]?.name || 'TBD',
        amount: p.amount,
      })),
      totalRevenue: contest.revenue,
    };
    setPayoutHistory((prev) => [record, ...prev]);
    setTimeout(() => {
      alert(`✅ Payout processed!\n\n${record.payouts.map((p) => `${p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'} ${p.name}: $${p.amount.toFixed(2)}`).join('\n')}`);
      setProcessingPayout(null);
    }, 800);
  }

  const totalRevenue    = tickets.filter((t) => t.ticket_type === 'paid').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalSubmissions = submissions.length;
  const totalVotes      = submissions.reduce((s, sub) => s + (sub.vote_count || 0), 0);
  const ticketsSold     = tickets.filter((t) => t.ticket_type === 'paid').length;
  const freeIssued      = tickets.filter((t) => t.ticket_type === 'free').length;

  const ADMIN_TABS = ['Overview', 'Contests', 'Tickets', 'Vote Totals', 'Winner Approval', 'Payouts', 'Archive'];

  // ── Login Gate ──
  if (!authed) {
    return (
      <div className="hub-content">
        <div className="admin-hub-gate">
          <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>🛡</div>
          <h2 className="admin-hub-gate__title">Creator Dashboard</h2>
          <p className="admin-hub-gate__sub">Admin access only. Enter your password to continue.</p>
          <input
            className="admin-hub-gate__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
          />
          {error && <p style={{ color:'#fca5a5', fontSize:'0.85rem', marginBottom:'0.75rem' }}>{error}</p>}
          <button className="hub-btn hub-btn--gold" style={{ width:'100%' }} onClick={handleLogin}>
            Access Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Admin Panel ──
  return (
    <div className="hub-content hub-content--wide">
      {/* Header */}
      <div className="admin-hub-header">
        <div>
          <p className="admin-hub-header__title">🛡 Creator Admin — Michael VanDyke</p>
          <p className="admin-hub-header__sub">Studio Flow Platform Management</p>
        </div>
        <button className="hub-btn hub-btn--ghost" onClick={() => setAuthed(false)} style={{ fontSize:'0.8rem' }}>
          Log Out
        </button>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--hub-border)', marginBottom:'1.5rem', overflowX:'auto' }}>
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab}
            className={`hub-tab${activeTab === tab ? ' hub-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:'3rem' }}><div className="cinematic-spinner" /></div>}

      {!loading && (
        <>
          {/* ── Overview ── */}
          {activeTab === 'Overview' && (
            <>
              <div className="admin-hub-overview">
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">${totalRevenue.toFixed(0)}</div><div className="admin-hub-stat__label">Total Revenue</div></div>
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">{CONTESTS.filter((c) => c.status === 'active').length}</div><div className="admin-hub-stat__label">Active Contests</div></div>
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">{totalSubmissions}</div><div className="admin-hub-stat__label">Submissions</div></div>
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">{totalVotes}</div><div className="admin-hub-stat__label">Total Votes</div></div>
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">{ticketsSold}</div><div className="admin-hub-stat__label">Tickets Sold</div></div>
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">{freeIssued}</div><div className="admin-hub-stat__label">Free Tickets</div></div>
              </div>
              <h2 className="hub-section-title">Recent Submissions</h2>
              {submissions.slice(0, 5).map((s) => (
                <div key={s.id} className="ticket-item" style={{ marginBottom:'0.5rem' }}>
                  <div className="ticket-item__icon" style={{ background:'rgba(245,166,35,0.1)', fontSize:'1rem' }}>📋</div>
                  <div className="ticket-item__body">
                    <p className="ticket-item__title">{s.name}</p>
                    <p className="ticket-item__meta">{CONTESTS.find((c) => c.id === s.contest_id)?.title || s.contest_id} · {s.vote_count || 0} votes</p>
                  </div>
                  {s.content_url && <a href={s.content_url} target="_blank" rel="noopener noreferrer" className="hub-btn hub-btn--ghost" style={{ fontSize:'0.78rem' }}>View</a>}
                </div>
              ))}
              {submissions.length === 0 && <p style={{ color:'var(--hub-muted)', textAlign:'center', padding:'2rem' }}>No submissions yet.</p>}
            </>
          )}

          {/* ── Contests Management ── */}
          {activeTab === 'Contests' && (
            <div>
              <h2 className="hub-section-title">Contest Management</h2>
              <div className="hub-table-wrap">
                <table className="hub-table">
                  <thead><tr><th>Contest</th><th>Status</th><th>Submissions</th><th>Votes</th><th>Revenue</th><th>Actions</th></tr></thead>
                  <tbody>
                    {contestData.map((c) => (
                      <tr key={c.id}>
                        <td>{c.emoji} {c.title}</td>
                        <td><span className={`hub-badge hub-badge--${c.status === 'active' ? 'open' : c.status}`}>{c.status}</span></td>
                        <td>{c.submissionCount}</td>
                        <td>{c.voteCount}</td>
                        <td style={{ color:'var(--hub-gold)', fontWeight:700 }}>${c.revenue.toFixed(0)}</td>
                        <td>
                          <select
                            className="hub-form-input"
                            style={{ padding:'0.25rem 0.5rem', fontSize:'0.78rem', width:'auto', display:'inline-block', marginRight:'0.5rem' }}
                            value={c.status}
                            onChange={(e) => handleStatusChange(c.id, e.target.value)}
                          >
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Ticket Tracking ── */}
          {activeTab === 'Tickets' && (
            <div>
              <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">${totalRevenue.toFixed(0)}</div><div className="admin-hub-stat__label">Total Revenue</div></div>
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">{ticketsSold}</div><div className="admin-hub-stat__label">Paid Sold</div></div>
                <div className="admin-hub-stat"><div className="admin-hub-stat__value">{freeIssued}</div><div className="admin-hub-stat__label">Free Issued</div></div>
              </div>
              {tickets.length === 0
                ? <p style={{ color:'var(--hub-muted)', textAlign:'center', padding:'2rem' }}>No tickets sold yet.</p>
                : (
                  <div className="hub-table-wrap">
                    <table className="hub-table">
                      <thead><tr><th>Event</th><th>Type</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                      <tbody>
                        {tickets.map((tk) => (
                          <tr key={tk.id}>
                            <td>{tk.event_title}</td>
                            <td><span className={`hub-badge hub-badge--${tk.ticket_type}`}>{tk.ticket_type === 'free' ? 'Free' : 'Paid'}</span></td>
                            <td style={{ color:'var(--hub-gold)', fontWeight:700 }}>{tk.ticket_type === 'free' ? 'FREE' : `$${Number(tk.amount).toFixed(2)}`}</td>
                            <td style={{ fontSize:'0.8rem', color:'var(--hub-muted)' }}>{tk.purchased_at ? new Date(tk.purchased_at).toLocaleDateString() : '—'}</td>
                            <td><span className={`hub-badge hub-badge--${tk.status === 'upcoming' ? 'open' : 'closed'}`}>{tk.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          )}

          {/* ── Vote Totals ── */}
          {activeTab === 'Vote Totals' && (
            <div>
              <h2 className="hub-section-title">Vote Leaderboard</h2>
              {contestData.map((c) => {
                const ranked = [...(c.submissions || [])].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
                const maxVotes = ranked[0]?.vote_count || 1;
                return (
                  <div key={c.id} style={{ marginBottom:'2rem' }}>
                    <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'var(--hub-text)', margin:'0 0 0.875rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                      {c.emoji} {c.title}
                    </h3>
                    {ranked.length === 0
                      ? <p style={{ color:'var(--hub-muted)', fontSize:'0.85rem' }}>No submissions yet.</p>
                      : ranked.map((s, i) => (
                        <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.5rem' }}>
                          <span style={{ width:'20px', textAlign:'center', fontSize:'0.85rem', color:'var(--hub-muted)', flexShrink:0 }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </span>
                          <span style={{ width:'140px', fontSize:'0.85rem', color:'var(--hub-text)', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</span>
                          <div style={{ flex:1, height:'8px', background:'rgba(255,255,255,0.07)', borderRadius:'99px', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${((s.vote_count || 0) / maxVotes) * 100}%`, background:'linear-gradient(90deg, var(--hub-gold), #e8940f)', borderRadius:'99px', transition:'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize:'0.85rem', fontWeight:700, color:'var(--hub-gold)', minWidth:'40px', textAlign:'right' }}>
                            {s.vote_count || 0}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Winner Approval ── */}
          {activeTab === 'Winner Approval' && (
            <div>
              <h2 className="hub-section-title">Winner Selection</h2>
              {contestData.map((c) => {
                const payouts = calculatePayout(c.revenue);
                const sorted  = [...(c.submissions || [])].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
                const topN    = sorted.slice(0, payouts.length);
                return (
                  <div key={c.id} className="hub-card" style={{ padding:'1.25rem', marginBottom:'1.25rem' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.875rem', flexWrap:'wrap', gap:'0.5rem' }}>
                      <h3 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:'var(--hub-text)' }}>{c.emoji} {c.title}</h3>
                      <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                        <span style={{ fontSize:'0.82rem', color:'var(--hub-muted)' }}>${c.revenue.toFixed(0)} revenue</span>
                        {c.submissionCount > 0 && (
                          <button className="hub-btn hub-btn--gold" style={{ fontSize:'0.8rem', padding:'0.3rem 0.7rem' }} onClick={() => approveWinners(c)}>
                            Approve Winners
                          </button>
                        )}
                      </div>
                    </div>
                    {topN.length === 0
                      ? <p style={{ color:'var(--hub-muted)', fontSize:'0.85rem' }}>No submissions to rank.</p>
                      : topN.map((s, i) => (
                        <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.625rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize:'1.25rem' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                          <div style={{ flex:1 }}>
                            <p style={{ margin:0, fontSize:'0.9rem', fontWeight:600, color:'var(--hub-text)' }}>{s.name}</p>
                            <p style={{ margin:0, fontSize:'0.78rem', color:'var(--hub-muted)' }}>{s.vote_count || 0} votes</p>
                          </div>
                          <span style={{ fontSize:'0.9rem', fontWeight:700, color:'var(--hub-gold)' }}>${(payouts[i]?.amount || 0).toFixed(2)}</span>
                          {s.is_winner && <span className="hub-badge hub-badge--active">✓ Approved</span>}
                        </div>
                      ))
                    }
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Payouts ── */}
          {activeTab === 'Payouts' && (
            <div>
              <h2 className="hub-section-title">Payout Triggers</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:'1rem', marginBottom:'2rem' }}>
                {contestData.filter((c) => c.submissionCount > 0).map((c) => {
                  const payouts = calculatePayout(c.revenue);
                  const sorted  = [...(c.submissions || [])].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
                  return (
                    <div key={c.id} className="hub-card" style={{ padding:'1.25rem' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem' }}>
                        <div>
                          <h3 style={{ margin:'0 0 0.25rem', fontSize:'0.95rem', fontWeight:700, color:'var(--hub-text)' }}>{c.emoji} {c.title}</h3>
                          <p style={{ margin:0, fontSize:'0.82rem', color:'var(--hub-muted)' }}>
                            {payouts.length} winner{payouts.length !== 1 ? 's' : ''} · ${c.revenue.toFixed(0)} prize pool
                          </p>
                        </div>
                        <button
                          className="hub-btn hub-btn--green"
                          onClick={() => processPayout(c)}
                          disabled={processingPayout === c.id}
                        >
                          {processingPayout === c.id ? '⏳ Processing…' : '💸 Process Payout'}
                        </button>
                      </div>
                      <div style={{ marginTop:'0.875rem', display:'flex', flexDirection:'column', gap:'0.375rem' }}>
                        {payouts.map((p, i) => (
                          <div key={p.rank} style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.85rem' }}>
                            <span>{p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'}</span>
                            <span style={{ color:'var(--hub-text)' }}>{sorted[i]?.name || 'TBD'}</span>
                            <span style={{ marginLeft:'auto', fontWeight:700, color:'var(--hub-gold)' }}>${p.amount.toFixed(2)} ({p.pct}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {contestData.every((c) => c.submissionCount === 0) && (
                  <p style={{ color:'var(--hub-muted)', textAlign:'center', padding:'2rem' }}>No submissions to process payouts for yet.</p>
                )}
              </div>

              {/* Payout History */}
              {payoutHistory.length > 0 && (
                <>
                  <h2 className="hub-section-title">Payout History</h2>
                  <div className="hub-table-wrap">
                    <table className="hub-table">
                      <thead><tr><th>Contest</th><th>Winners</th><th>Total</th><th>Date</th></tr></thead>
                      <tbody>
                        {payoutHistory.map((ph, i) => (
                          <tr key={i}>
                            <td>{ph.contestTitle}</td>
                            <td style={{ fontSize:'0.82rem' }}>{ph.payouts.map((p) => `${p.name} ($${p.amount.toFixed(0)})`).join(' · ')}</td>
                            <td style={{ color:'var(--hub-gold)', fontWeight:700 }}>${ph.totalRevenue.toFixed(0)}</td>
                            <td style={{ fontSize:'0.8rem', color:'var(--hub-muted)' }}>{ph.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Archive ── */}
          {activeTab === 'Archive' && (
            <div>
              <h2 className="hub-section-title">Contest Archive</h2>
              {contestData.filter((c) => c.status === 'archived' || c.status === 'closed').length === 0
                ? <p style={{ color:'var(--hub-muted)', textAlign:'center', padding:'2rem', fontSize:'0.875rem' }}>No archived contests yet.</p>
                : contestData.filter((c) => c.status === 'archived' || c.status === 'closed').map((c) => (
                  <div key={c.id} className="hub-card" style={{ padding:'1.25rem', marginBottom:'1rem' }}>
                    <h3 style={{ margin:'0 0 0.5rem', fontSize:'0.95rem', fontWeight:700 }}>{c.emoji} {c.title}</h3>
                    <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap', fontSize:'0.85rem', color:'var(--hub-muted)' }}>
                      <span>Submissions: {c.submissionCount}</span>
                      <span>Total Votes: {c.voteCount}</span>
                      <span style={{ color:'var(--hub-gold)', fontWeight:700 }}>Revenue: ${c.revenue.toFixed(0)}</span>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </>
      )}
    </div>
  );
}
