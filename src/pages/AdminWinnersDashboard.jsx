import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';
import { supabase } from '../lib/supabase';
import { format, formatDistanceToNow } from 'date-fns';
import '../styles/admin.css';

const PLACE_MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function placeLabel(n) {
  if (PLACE_MEDALS[n]) return `${PLACE_MEDALS[n]} ${n}${ordinal(n)}`;
  return `${n}${ordinal(n)}`;
}
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export default function AdminWinnersDashboard() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // ── Data ────────────────────────────────────────────────────────
  const [winners,   setWinners]   = useState([]);
  const [contests,  setContests]  = useState([]);
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // ── Filters & sort ──────────────────────────────────────────────
  const [filterContest, setFilterContest] = useState('');
  const [filterEvent,   setFilterEvent]   = useState('');
  const [filterPlace,   setFilterPlace]   = useState('');
  const [sortField,     setSortField]     = useState('created_at');
  const [sortDir,       setSortDir]       = useState('desc');

  // ── Pull Winners form ────────────────────────────────────────────
  const [showPullForm,   setShowPullForm]   = useState(false);
  const [pullContest,    setPullContest]    = useState('');
  const [pullEvent,      setPullEvent]      = useState('');
  const [pullN,          setPullN]          = useState(3);
  const [pullPayouts,    setPullPayouts]    = useState([100, 50, 25]);
  const [pulling,        setPulling]        = useState(false);
  const [pullResult,     setPullResult]     = useState(null);
  const [pullError,      setPullError]      = useState('');

  // ── Auth guard ──────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isCreatorAdmin(role)) { navigate('/'); return; }
    loadAll();
  }, [authLoading, role]);

  // ── Load ─────────────────────────────────────────────────────────
  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [winnersRes, contestsRes, eventsRes] = await Promise.all([
        supabase
          .from('winner_history')
          .select('id, user_id, event_id, contest_id, place_number, payout_amount, created_at, profiles(username, display_name)')
          .order('created_at', { ascending: false }),
        supabase.from('contests').select('id, title').order('title', { ascending: true }),
        supabase.from('events').select('id, title').order('title', { ascending: true }),
      ]);

      if (winnersRes.error) throw winnersRes.error;
      setWinners(winnersRes.data || []);
      setContests(contestsRes.data || []);
      setEvents(eventsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load winner history.');
    } finally {
      setLoading(false);
    }
  }

  // ── Pull winners ─────────────────────────────────────────────────
  async function handlePullWinners(e) {
    e.preventDefault();
    if (!pullContest) { setPullError('Select a contest first.'); return; }
    if (!pullEvent)   { setPullError('Select an event first.'); return; }
    if (pullN < 1)    { setPullError('Number of winners must be at least 1.'); return; }

    setPulling(true);
    setPullError('');
    setPullResult(null);

    try {
      const token = await getToken();
      const resp = await fetch(`/api/contests/${pullContest}/pull-winners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventId: pullEvent,
          numberOfWinners: pullN,
          payouts: pullPayouts.slice(0, pullN),
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || `Server error ${resp.status}`);
      setPullResult(json);
      loadAll();
    } catch (err) {
      setPullError(err.message);
    } finally {
      setPulling(false);
    }
  }

  // ── Keep payouts array in sync with pullN ─────────────────────────
  useEffect(() => {
    setPullPayouts((prev) => {
      const next = [...prev];
      while (next.length < pullN) next.push(0);
      return next.slice(0, pullN);
    });
  }, [pullN]);

  // ── Computed stats ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalWinners   = winners.length;
    const totalPayout    = winners.reduce((sum, w) => sum + Number(w.payout_amount || 0), 0);
    const uniqueUsers    = new Set(winners.map((w) => w.user_id)).size;
    const lastWinner     = winners[0];
    return { totalWinners, totalPayout, uniqueUsers, lastWinner };
  }, [winners]);

  // ── Filtered + sorted list ────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...winners];
    if (filterContest) list = list.filter((w) => w.contest_id === filterContest);
    if (filterEvent)   list = list.filter((w) => w.event_id   === filterEvent);
    if (filterPlace)   list = list.filter((w) => String(w.place_number) === filterPlace);
    list.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === 'created_at') { va = new Date(va); vb = new Date(vb); }
      if (va < vb) return sortDir === 'asc' ? -1 :  1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return list;
  }, [winners, filterContest, filterEvent, filterPlace, sortField, sortDir]);

  function toggleSort(field) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  }

  function sortIcon(field) {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}> ↕</span>;
    return <span style={{ color: 'var(--accent-blue)' }}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>;
  }

  function winnerName(w) {
    return w.profiles?.display_name || w.profiles?.username || w.user_id?.slice(0, 8) + '…';
  }

  function contestTitle(id) {
    return contests.find((c) => c.id === id)?.title || id?.slice(0, 8) + '…' || '—';
  }
  function eventTitle(id) {
    return events.find((e) => e.id === id)?.title || id?.slice(0, 8) + '…' || '—';
  }

  // ── Render guards ────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="cinematic-spinner" />
      </div>
    );
  }

  return (
    <div className="page-container page-container--wide">

      {/* ── Header ── */}
      <div className="page-header">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f2c98f', background: 'rgba(242,201,143,0.1)', border: '1px solid rgba(242,201,143,0.25)', borderRadius: '4px', padding: '0.2rem 0.55rem' }}>
            🛡 Admin
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Winner Dashboard</h1>
            <p className="page-subtitle">All drawn winners across contests and events</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="admin-action-btn"
              onClick={loadAll}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {loading ? '…' : '↻'} Refresh
            </button>
            <button
              className="btn btn--primary"
              onClick={() => { setShowPullForm((v) => !v); setPullResult(null); setPullError(''); }}
            >
              {showPullForm ? 'Close Panel' : '+ Pull Winners'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="admin-stats" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-stat-card admin-stat-card--gold">
          <div className="admin-stat-value">{stats.totalWinners}</div>
          <div className="admin-stat-label">Total Winners</div>
        </div>
        <div className="admin-stat-card admin-stat-card--green">
          <div className="admin-stat-value">${stats.totalPayout.toLocaleString()}</div>
          <div className="admin-stat-label">Total Payout</div>
        </div>
        <div className="admin-stat-card admin-stat-card--blue">
          <div className="admin-stat-value">{stats.uniqueUsers}</div>
          <div className="admin-stat-label">Unique Winners</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value" style={{ fontSize: '0.95rem', paddingTop: '0.25rem' }}>
            {stats.lastWinner
              ? formatDistanceToNow(new Date(stats.lastWinner.created_at), { addSuffix: true })
              : '—'
            }
          </div>
          <div className="admin-stat-label">Last Drawn</div>
        </div>
      </div>

      {/* ── Pull Winners panel ── */}
      {showPullForm && (
        <div style={{ background: 'rgba(242,201,143,0.04)', border: '1px solid rgba(242,201,143,0.18)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.75rem' }}>
          <h2 className="admin-section-title" style={{ marginBottom: '1.25rem', color: 'var(--accent-gold)' }}>
            🎲 Pull Winners
          </h2>
          <form onSubmit={handlePullWinners} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Contest *</label>
                <select
                  className="form-input"
                  value={pullContest}
                  onChange={(e) => setPullContest(e.target.value)}
                  disabled={pulling}
                  required
                >
                  <option value="">— Select contest —</option>
                  {contests.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Event *</label>
                <select
                  className="form-input"
                  value={pullEvent}
                  onChange={(e) => setPullEvent(e.target.value)}
                  disabled={pulling}
                  required
                >
                  <option value="">— Select event —</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Number of Winners</label>
                <input
                  type="number"
                  className="form-input"
                  min={1}
                  max={10}
                  value={pullN}
                  onChange={(e) => setPullN(Math.max(1, Math.min(10, Number(e.target.value))))}
                  disabled={pulling}
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.5rem', display: 'block' }}>
                Payout per Place ($)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {pullPayouts.slice(0, pullN).map((amt, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(200,200,215,0.45)', textAlign: 'center' }}>
                      {placeLabel(i + 1)}
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={amt}
                      onChange={(e) => {
                        const next = [...pullPayouts];
                        next[i] = Number(e.target.value);
                        setPullPayouts(next);
                      }}
                      disabled={pulling}
                      style={{ width: '90px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.45rem 0.65rem', fontSize: '0.875rem', color: '#fff', outline: 'none', fontFamily: 'inherit', textAlign: 'center' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {pullError && (
              <p style={{ color: '#fca5a5', fontSize: '0.83rem', margin: 0 }}>{pullError}</p>
            )}

            {pullResult && (
              <div style={{ background: 'rgba(134,239,172,0.07)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: '10px', padding: '0.875rem 1rem' }}>
                <p style={{ color: '#86efac', fontWeight: 700, fontSize: '0.88rem', margin: '0 0 0.4rem' }}>
                  ✓ {pullResult.winners?.length || 0} winner(s) drawn
                  {pullResult.partial && <span style={{ color: '#f5a623', marginLeft: '0.5rem' }}> · Pool smaller than requested</span>}
                </p>
                {(pullResult.winners || []).map((w, i) => (
                  <p key={i} style={{ margin: '0.15rem 0', fontSize: '0.82rem', color: 'rgba(200,200,215,0.65)' }}>
                    {placeLabel(w.place_number)}: {w.displayName || w.email || w.userId?.slice(0, 8)} — ${w.payout || 0}
                  </p>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn--primary" disabled={pulling} style={{ minWidth: '140px' }}>
                {pulling ? 'Drawing…' : '🎲 Draw Winners'}
              </button>
              <button
                type="button"
                className="cinematic-button"
                onClick={() => { setShowPullForm(false); setPullResult(null); setPullError(''); }}
                disabled={pulling}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(200,200,215,0.45)', marginBottom: '0.3rem' }}>
            Contest
          </label>
          <select
            className="form-input"
            value={filterContest}
            onChange={(e) => setFilterContest(e.target.value)}
            style={{ fontSize: '0.83rem', padding: '0.4rem 0.7rem', minWidth: '160px' }}
          >
            <option value="">All contests</option>
            {contests.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(200,200,215,0.45)', marginBottom: '0.3rem' }}>
            Event
          </label>
          <select
            className="form-input"
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            style={{ fontSize: '0.83rem', padding: '0.4rem 0.7rem', minWidth: '160px' }}
          >
            <option value="">All events</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(200,200,215,0.45)', marginBottom: '0.3rem' }}>
            Place
          </label>
          <select
            className="form-input"
            value={filterPlace}
            onChange={(e) => setFilterPlace(e.target.value)}
            style={{ fontSize: '0.83rem', padding: '0.4rem 0.7rem', minWidth: '110px' }}
          >
            <option value="">All places</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={String(n)}>{placeLabel(n)}</option>)}
          </select>
        </div>
        {(filterContest || filterEvent || filterPlace) && (
          <button
            className="admin-action-btn"
            onClick={() => { setFilterContest(''); setFilterEvent(''); setFilterPlace(''); }}
            style={{ alignSelf: 'flex-end', fontSize: '0.78rem' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Error state ── */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', color: '#fca5a5' }}>
          <strong>Error loading winner history:</strong> {error}
          <button className="admin-action-btn" onClick={loadAll} style={{ marginLeft: '1rem' }}>Retry</button>
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="cinematic-spinner" />
          <p style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.88rem', marginTop: '0.75rem' }}>Loading winner history…</p>
        </div>
      )}

      {/* ── Table / empty state ── */}
      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏆</p>
              <p style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'rgba(200,200,215,0.8)' }}>
                {winners.length === 0 ? 'No winners have been selected yet.' : 'No winners match the current filters.'}
              </p>
              {winners.length === 0 && (
                <p style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.875rem' }}>
                  Use the <strong style={{ color: 'var(--accent-gold)' }}>Pull Winners</strong> button to draw winners for a contest.
                </p>
              )}
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.4)', marginBottom: '0.75rem' }}>
                Showing {filtered.length} of {winners.length} winner record{winners.length !== 1 ? 's' : ''}
              </p>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th
                        onClick={() => toggleSort('place_number')}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        Place{sortIcon('place_number')}
                      </th>
                      <th>Winner</th>
                      <th>Contest</th>
                      <th>Event</th>
                      <th>Payout</th>
                      <th
                        onClick={() => toggleSort('created_at')}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        Date Won{sortIcon('created_at')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((w) => (
                      <tr key={w.id}>
                        <td>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                            {PLACE_MEDALS[w.place_number] || ''}{' '}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: 'rgba(200,200,215,0.55)' }}>
                            {w.place_number}{ordinal(w.place_number)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{winnerName(w)}</span>
                          <br />
                          <span style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.35)', fontFamily: 'monospace' }}>
                            {w.user_id?.slice(0, 12)}…
                          </span>
                        </td>
                        <td style={{ fontSize: '0.83rem' }}>
                          {w.contest_id
                            ? <Link to={`/contests/${w.contest_id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
                                {contestTitle(w.contest_id)}
                              </Link>
                            : <span style={{ color: 'rgba(200,200,215,0.35)' }}>—</span>
                          }
                        </td>
                        <td style={{ fontSize: '0.83rem', color: 'rgba(200,200,215,0.6)' }}>
                          {w.event_id ? eventTitle(w.event_id) : <span style={{ opacity: 0.4 }}>—</span>}
                        </td>
                        <td>
                          {Number(w.payout_amount) > 0
                            ? <span style={{ color: '#86efac', fontWeight: 700 }}>${Number(w.payout_amount).toLocaleString()}</span>
                            : <span style={{ color: 'rgba(200,200,215,0.35)' }}>—</span>
                          }
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'rgba(200,200,215,0.55)', whiteSpace: 'nowrap' }}>
                          {w.created_at ? (
                            <>
                              <span>{format(new Date(w.created_at), 'MMM d, yyyy')}</span>
                              <br />
                              <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>
                                {formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}
                              </span>
                            </>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Back link ── */}
      <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Link to="/admin" style={{ fontSize: '0.83rem', color: 'rgba(200,200,215,0.45)', textDecoration: 'none' }}>
          ← Back to Admin Dashboard
        </Link>
      </div>
    </div>
  );
}
