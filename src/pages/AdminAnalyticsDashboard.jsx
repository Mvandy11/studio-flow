import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';
import { supabase } from '../lib/supabase';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import '../styles/admin.css';

// ── Theme constants ──────────────────────────────────────────────
const COLORS  = ['#f2c98f', '#6ea8ff', '#86efac', '#fca5a5', '#a78bfa', '#67e8f9', '#fb923c'];
const AXIS_COLOR  = 'rgba(200,200,215,0.4)';
const GRID_COLOR  = 'rgba(255,255,255,0.05)';
const TT_STYLE    = { background: '#0d1726', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#c7c7d1', fontSize: '0.82rem' };

const RANGES = [
  { label: '7 days',  value: '7d'  },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: 'All time',value: 'all' },
];

const ACTIVITY_COLORS = {
  contest: '#f2c98f',
  event:   '#6ea8ff',
  user:    '#86efac',
  ticket:  '#a78bfa',
  winner:  '#fca5a5',
};

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

// ── Recharts custom tooltip ──────────────────────────────────────
function DarkTooltip({ active, payload, label, prefix = '', suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TT_STYLE}>
      <p style={{ margin: '0 0 0.4rem', fontWeight: 700, color: 'rgba(200,200,215,0.7)', fontSize: '0.75rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '0.15rem 0', color: p.color || '#c7c7d1' }}>
          {p.name}: {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}
        </p>
      ))}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────
function StatCard({ label, value, icon, sub, accent }) {
  const accentStyles = {
    gold:  { cardClass: 'admin-stat-card--gold',  color: 'var(--accent-gold, #f2c98f)' },
    blue:  { cardClass: 'admin-stat-card--blue',  color: 'var(--accent-blue, #6ea8ff)' },
    green: { cardClass: 'admin-stat-card--green', color: '#86efac' },
    purple:{ cardClass: '',                        color: '#a78bfa' },
    red:   { cardClass: '',                        color: '#fca5a5' },
  };
  const { cardClass, color } = accentStyles[accent] || { cardClass: '', color: 'var(--text-soft)' };
  return (
    <div className={`admin-stat-card ${cardClass}`} style={{ position: 'relative', overflow: 'hidden' }}>
      <span style={{ position: 'absolute', top: '0.8rem', right: '1rem', fontSize: '1.4rem', opacity: 0.2 }}>{icon}</span>
      <div className="admin-stat-value" style={{ color }}>{value}</div>
      <div className="admin-stat-label">{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'rgba(200,200,215,0.35)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────
function Section({ title, children, action }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.25rem 1.5rem' }}>
      <div className="admin-section-header" style={{ marginBottom: '1.25rem' }}>
        <h2 className="admin-section-title">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Empty chart placeholder ──────────────────────────────────────
function ChartEmpty({ message = 'No data available yet.' }) {
  return (
    <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(200,200,215,0.35)', fontSize: '0.85rem', gap: '0.5rem' }}>
      <span style={{ fontSize: '1.5rem' }}>📊</span>
      {message}
    </div>
  );
}

export default function AdminAnalyticsDashboard() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [range,    setRange]    = useState('30d');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // ── Auth guard ───────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isCreatorAdmin(role)) { navigate('/'); return; }
    loadAnalytics();
  }, [authLoading, role]);

  // Re-fetch when range changes (only after auth confirmed)
  useEffect(() => {
    if (authLoading || !isCreatorAdmin(role)) return;
    loadAnalytics();
  }, [range]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const resp  = await fetch(`/api/admin/analytics?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || `Server error ${resp.status}`);
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  // ── Render guards ────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div className="cinematic-spinner" />
      </div>
    );
  }

  const totals   = data?.totals         || {};
  const activity = data?.recentActivity || [];

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
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">Platform-wide activity overview</p>
          </div>
          <button className="admin-action-btn" onClick={loadAnalytics} disabled={loading}>
            {loading ? '…' : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* ── Range filter ── */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {RANGES.map(r => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '8px',
              border: range === r.value ? '1px solid rgba(242,201,143,0.4)' : '1px solid rgba(255,255,255,0.1)',
              background: range === r.value ? 'rgba(242,201,143,0.1)' : 'rgba(255,255,255,0.03)',
              color: range === r.value ? '#f2c98f' : 'rgba(200,200,215,0.55)',
              fontSize: '0.82rem',
              fontWeight: range === r.value ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ── Error state ── */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <span><strong>Error:</strong> {error}</span>
          <button className="admin-action-btn" onClick={loadAnalytics}>Retry</button>
        </div>
      )}

      {/* ── Loading overlay ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="cinematic-spinner" />
          <p style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.88rem', marginTop: '0.75rem' }}>Loading analytics…</p>
        </div>
      )}

      {!loading && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* ── Summary cards ── */}
          <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 0 }}>
            <StatCard icon="🎵" label="Contests"        value={totals.contests        ?? 0} accent="gold" />
            <StatCard icon="🎤" label="Events"          value={totals.events          ?? 0} accent="blue" />
            <StatCard icon="👥" label="Users"           value={totals.users           ?? 0} accent="green" />
            <StatCard icon="🎟" label="Ticket Sales"    value={totals.ticketPurchases ?? 0} accent="purple" />
            <StatCard icon="💰" label="Revenue"         value={`$${(totals.revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} accent="green" />
            <StatCard icon="🏆" label="Winners Drawn"   value={totals.winners         ?? 0} accent="gold" />
            <StatCard icon="🌟" label="Unique Winners"  value={totals.uniqueWinners   ?? 0} accent="red" />
          </div>

          {/* ── Charts row 1: Tickets over time + Revenue by event ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>

            <Section title="Ticket Sales Over Time">
              {data.ticketsByDay?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.ticketsByDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                    <XAxis dataKey="date" tick={{ fill: AXIS_COLOR, fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} allowDecimals={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.75rem', color: AXIS_COLOR }} />
                    <Line type="monotone" dataKey="count"   name="Tickets"  stroke="#6ea8ff" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="revenue" name="Revenue $" stroke="#f2c98f" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <ChartEmpty message="No ticket sales in this period." />}
            </Section>

            <Section title="Revenue by Event">
              {data.revenueByEvent?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.revenueByEvent} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                    <XAxis dataKey="title" tick={{ fill: AXIS_COLOR, fontSize: 9 }} />
                    <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
                    <Tooltip content={<DarkTooltip prefix="$" />} />
                    <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                      {data.revenueByEvent.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <ChartEmpty message="No event revenue yet." />}
            </Section>
          </div>

          {/* ── Charts row 2: Winners by place + Users by week ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>

            <Section title="Winners by Place">
              {data.winnersByPlace?.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <ResponsiveContainer width="60%" height={200}>
                    <PieChart>
                      <Pie
                        data={data.winnersByPlace}
                        dataKey="count"
                        nameKey="name"
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80}
                        paddingAngle={3}
                      >
                        {data.winnersByPlace.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {data.winnersByPlace.map((w, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: 'rgba(200,200,215,0.6)' }}>Place {w.place}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: COLORS[i % COLORS.length] }}>{w.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <ChartEmpty message="No winners drawn yet." />}
            </Section>

            <Section title="New Users by Week">
              {data.usersByWeek?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.usersByWeek} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                    <XAxis dataKey="week" tick={{ fill: AXIS_COLOR, fontSize: 9 }} />
                    <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} allowDecimals={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="count" name="New Users" fill="#86efac" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <ChartEmpty message="No user signup data yet." />}
            </Section>
          </div>

          {/* ── Top tables ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>

            {/* Top Events */}
            <Section title="Top Events by Ticket Sales">
              {data.topEvents?.length > 0 ? (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th style={{ textAlign: 'right' }}>Tickets</th>
                        <th style={{ textAlign: 'right' }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topEvents.map((ev, i) => (
                        <tr key={ev.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ color: COLORS[i % COLORS.length], fontWeight: 700, fontSize: '0.75rem', width: '18px' }}>#{i + 1}</span>
                              <Link to={`/events/${ev.id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.85rem' }}>
                                {ev.title}
                              </Link>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{ev.ticketsSold}</td>
                          <td style={{ textAlign: 'right', color: '#86efac', fontWeight: 700 }}>
                            ${Number(ev.revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="admin-empty" style={{ padding: '2rem 0' }}>No ticket sales yet.</p>
              )}
            </Section>

            {/* Top Contests */}
            <Section title="Top Contests by Participation">
              {data.topContests?.length > 0 ? (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Contest</th>
                        <th style={{ textAlign: 'right' }}>Entries</th>
                        <th style={{ textAlign: 'right' }}>Participants</th>
                        <th style={{ textAlign: 'right' }}>Winners</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topContests.map((c, i) => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ color: COLORS[i % COLORS.length], fontWeight: 700, fontSize: '0.75rem', width: '18px' }}>#{i + 1}</span>
                              <Link to={`/contests/${c.id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.85rem' }}>
                                {c.title}
                              </Link>
                            </div>
                            {c.status && (
                              <span className={`admin-badge admin-badge--${c.status}`} style={{ marginLeft: '26px', marginTop: '0.15rem', display: 'inline-block' }}>
                                {c.status}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.entries}</td>
                          <td style={{ textAlign: 'right', color: 'rgba(200,200,215,0.6)' }}>{c.participants}</td>
                          <td style={{ textAlign: 'right', color: c.winners > 0 ? '#f2c98f' : 'rgba(200,200,215,0.3)', fontWeight: c.winners > 0 ? 700 : 400 }}>
                            {c.winners || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="admin-empty" style={{ padding: '2rem 0' }}>No contests yet.</p>
              )}
            </Section>
          </div>

          {/* ── Recent activity feed ── */}
          <Section
            title="Recent Activity"
            action={
              <span style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.4)' }}>
                Last {activity.length} events
              </span>
            }
          >
            {activity.length === 0 ? (
              <p className="admin-empty" style={{ padding: '2rem 0' }}>No recent activity in this period.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {activity.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.65rem 0',
                      borderBottom: i < activity.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                  >
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: `${ACTIVITY_COLORS[item.type] || '#6ea8ff'}18`,
                      border: `1px solid ${ACTIVITY_COLORS[item.type] || '#6ea8ff'}33`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.78rem',
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(200,200,215,0.8)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.text}
                      </p>
                      <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: 'rgba(200,200,215,0.35)' }}>
                        {item.ts ? formatDistanceToNow(new Date(item.ts), { addSuffix: true }) : ''}
                      </p>
                    </div>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: ACTIVITY_COLORS[item.type] || '#6ea8ff',
                      background: `${ACTIVITY_COLORS[item.type] || '#6ea8ff'}14`,
                      border: `1px solid ${ACTIVITY_COLORS[item.type] || '#6ea8ff'}30`,
                      borderRadius: '99px',
                      padding: '0.15rem 0.5rem',
                      flexShrink: 0,
                    }}>
                      {item.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── Back link ── */}
          <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link to="/admin" style={{ fontSize: '0.83rem', color: 'rgba(200,200,215,0.45)', textDecoration: 'none' }}>
              ← Back to Admin Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
