import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api.js';
import { formatDistanceToNow } from 'date-fns';
import '../styles/portfolio.css';

const SOURCE_LABELS = {
  ticket_sale:   '🎟 Ticket Sale',
  contest_prize: '🏆 Contest Prize',
  event_revenue: '📅 Event Revenue',
};

const STATUS_COLORS = {
  pending:   'rgba(245,166,35,0.8)',
  requested: 'rgba(96,165,250,0.8)',
  paid:      'rgba(74,222,128,0.8)',
  failed:    'rgba(248,113,113,0.8)',
};

const CURRENT_MONTH = new Date().toISOString().slice(0, 7); // "YYYY-MM"

const POOL_SOURCE_LABELS = {
  subscription: '🟣 Creator_50 Subscription',
  donation:     '💛 Donation Received',
};

export default function EarningsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [earnings,     setEarnings]     = useState([]);
  const [donations,    setDonations]    = useState([]);
  const [poolEntries,  setPoolEntries]  = useState([]);
  const [poolMonthly,  setPoolMonthly]  = useState(0);
  const [poolAllTime,  setPoolAllTime]  = useState(0);
  const [poolTotal,    setPoolTotal]    = useState(0);
  const [settings,     setSettings]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [requesting,   setRequesting]   = useState(false);
  const [requestMsg,   setRequestMsg]   = useState('');

  useEffect(() => {
    if (authLoading || !user) return;

    const startOfMonth = `${CURRENT_MONTH}-01`;
    const [y, m] = CURRENT_MONTH.split('-').map(Number);
    const nextMonth = m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, '0')}-01`;

    Promise.all([
      supabase
        .from('earnings')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('creator_settings')
        .select('payout_method, paypal, cashapp, venmo, stripe, custom_url')
        .eq('creator_id', user.id)
        .maybeSingle(),
      supabase
        .from('donations')
        .select('id, amount, created_at, event_id, event_slots:event_id ( title )')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      // All pool entries for this creator
      supabase
        .from('revenue_pool_entries')
        .select('id, amount, source, created_at')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      // This month's pool entries
      supabase
        .from('revenue_pool_entries')
        .select('amount')
        .eq('creator_id', user.id)
        .gte('created_at', startOfMonth)
        .lt('created_at', nextMonth),
      // Current month pool total
      supabase
        .from('revenue_pool')
        .select('total_amount')
        .eq('month', CURRENT_MONTH)
        .maybeSingle(),
    ]).then(([earningsRes, settingsRes, donationsRes, poolAllRes, poolMonthRes, poolTotalRes]) => {
      setEarnings(earningsRes.data || []);
      setSettings(settingsRes.data || null);
      setDonations(donationsRes.data || []);

      const allEntries   = poolAllRes.data   || [];
      const monthEntries = poolMonthRes.data  || [];
      setPoolEntries(allEntries);
      setPoolAllTime(allEntries.reduce((s, e) => s + Number(e.amount), 0));
      setPoolMonthly(monthEntries.reduce((s, e) => s + Number(e.amount), 0));
      setPoolTotal(poolTotalRes.data?.total_amount ?? 0);

      setLoading(false);
    });
  }, [authLoading, user]);

  async function handleRequestPayout() {
    if (!user) return;
    setRequesting(true);
    setRequestMsg('');
    try {
      const json = await api('/api/payouts/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id }),
      });
      setRequestMsg(`Payout requested for ${json.rowsUpdated} earning(s). We'll process it shortly.`);
      // Optimistically update status in UI
      setEarnings((prev) =>
        prev.map((e) => e.status === 'pending' ? { ...e, status: 'requested' } : e)
      );
    } catch (err) {
      setRequestMsg(err.message || 'Network error — please try again.');
    } finally {
      setRequesting(false);
    }
  }

  const total    = earnings.reduce((s, e) => s + Number(e.amount), 0);
  const pending  = earnings.filter((e) => e.status === 'pending')
                           .reduce((s, e) => s + Number(e.amount), 0);
  const paid     = earnings.filter((e) => e.status === 'paid')
                           .reduce((s, e) => s + Number(e.amount), 0);
  const hasPending = earnings.some((e) => e.status === 'pending');

  const METHOD_LABELS = { paypal: 'PayPal', venmo: 'Venmo', stripe: 'Stripe Connect', cashapp: 'CashApp', bank: 'Bank Transfer' };
  const payoutMethodLabel = settings?.payout_method
    ? METHOD_LABELS[settings.payout_method] ?? settings.payout_method
    : null;

  if (authLoading || loading) return (
    <div className="earnings-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="cinematic-spinner" />
    </div>
  );

  if (!user) return (
    <div className="earnings-page" style={{ alignItems: 'center' }}>
      <p style={{ color: 'rgba(200,200,215,0.5)' }}>Log in to view your earnings.</p>
    </div>
  );

  return (
    <div className="earnings-page">
      <div className="page-header">
        <h1 className="page-title">◎ Earnings</h1>
        <p className="page-subtitle">Your revenue summary. You keep 98% of every ticket sale.</p>
      </div>

      {/* Summary Cards */}
      <div className="earnings-summary">
        <div className="earnings-summary-card earnings-summary-card--gold">
          <div className="earnings-summary-value">${total.toFixed(2)}</div>
          <div className="earnings-summary-label">Total Earned</div>
        </div>
        <div className="earnings-summary-card">
          <div className="earnings-summary-value" style={{ color: 'rgba(245,166,35,0.9)' }}>${pending.toFixed(2)}</div>
          <div className="earnings-summary-label">Pending Payout</div>
        </div>
        <div className="earnings-summary-card earnings-summary-card--green">
          <div className="earnings-summary-value">${paid.toFixed(2)}</div>
          <div className="earnings-summary-label">Paid Out</div>
        </div>
        <div className="earnings-summary-card earnings-summary-card--blue">
          <div className="earnings-summary-value">{earnings.length}</div>
          <div className="earnings-summary-label">Transactions</div>
        </div>
      </div>

      {/* Payout panel */}
      <div style={{ padding: '1.25rem 1.5rem', borderRadius: '14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
        <h2 className="earnings-section-title" style={{ margin: '0 0 0.5rem' }}>Payouts</h2>

        {payoutMethodLabel ? (
          <p style={{ fontSize: '0.88rem', color: 'rgba(200,200,215,0.55)', margin: '0 0 0.75rem' }}>
            Payout method: <strong style={{ color: '#fff' }}>{payoutMethodLabel}</strong> ·{' '}
            <Link to="/premier/settings" style={{ color: 'var(--accent-blue)' }}>Change</Link>
          </p>
        ) : (
          <p style={{ fontSize: '0.88rem', color: 'rgba(200,200,215,0.55)', margin: '0 0 0.75rem' }}>
            No payout method set.{' '}
            <Link to="/premier/settings" style={{ color: 'var(--accent-blue)' }}>Set one up →</Link>
          </p>
        )}

        {hasPending && payoutMethodLabel && (
          <button
            className="cinematic-button-accent"
            onClick={handleRequestPayout}
            disabled={requesting}
            style={{ fontSize: '0.9rem', padding: '0.55rem 1.5rem' }}
          >
            {requesting ? 'Requesting…' : `Request Payout — $${pending.toFixed(2)}`}
          </button>
        )}

        {requestMsg && (
          <p style={{ fontSize: '0.85rem', color: 'rgba(200,200,215,0.7)', marginTop: '0.75rem' }}>
            {requestMsg}
          </p>
        )}
      </div>

      {/* ── My Monthly Earnings ────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="earnings-section-title">📈 My Monthly Earnings</h2>
        <div style={{
          display: 'flex', gap: '1rem', flexWrap: 'wrap',
          padding: '1.25rem 1.5rem', borderRadius: '14px',
          background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)',
        }}>
          <div style={{ flex: '1 1 160px' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.4)', marginBottom: '0.3rem' }}>
              Your Pool Contributions This Month
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a78bfa' }}>
              ${poolMonthly.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.4)', marginTop: '0.2rem' }}>
              {CURRENT_MONTH}
            </div>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.4)', marginBottom: '0.3rem' }}>
              Total Pool This Month
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
              ${poolTotal.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)', marginTop: '0.2rem' }}>
              across all creators
            </div>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.4)', marginBottom: '0.3rem' }}>
              All-Time Pool Activity
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60a5fa' }}>
              ${poolAllTime.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)', marginTop: '0.2rem' }}>
              total contributed
            </div>
          </div>
        </div>
      </div>

      {/* ── My Revenue Pool Contributions ──────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="earnings-section-title">🟣 My Revenue Pool Contributions</h2>
        {poolEntries.length === 0 ? (
          <div className="earnings-empty">
            <p>No pool contributions yet.</p>
            <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
              Upgrade to Creator_50 or receive donations to start contributing.
            </p>
          </div>
        ) : (
          <div className="earnings-txn-list">
            {poolEntries.map((e) => (
              <div key={e.id} className="earnings-txn">
                <div className="earnings-txn__icon" style={{ background: e.source === 'subscription' ? 'rgba(167,139,250,0.1)' : 'rgba(245,166,35,0.1)' }}>
                  {e.source === 'subscription' ? '🟣' : '💛'}
                </div>
                <div className="earnings-txn__label">
                  {POOL_SOURCE_LABELS[e.source] || e.source}
                </div>
                <div className="earnings-txn__amount" style={{ color: e.source === 'subscription' ? '#a78bfa' : '#f5a623' }}>
                  +${Number(e.amount).toFixed(2)}
                </div>
                <div className="earnings-txn__date">
                  {e.created_at
                    ? formatDistanceToNow(new Date(e.created_at), { addSuffix: true })
                    : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Donations received ─────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="earnings-section-title">💛 Donations Received</h2>
        {donations.length === 0 ? (
          <div className="earnings-empty">
            <p>No donations received yet.</p>
            <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
              Post events and share your donation link to start receiving support.
            </p>
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem',
            }}>
              <div style={{
                padding: '0.875rem 1.25rem', borderRadius: '12px',
                background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)',
                minWidth: '140px',
              }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f5a623' }}>
                  ${donations.reduce((s, d) => s + Number(d.amount), 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.45)', marginTop: '0.2rem' }}>
                  Total Received
                </div>
              </div>
              <div style={{
                padding: '0.875rem 1.25rem', borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                minWidth: '140px',
              }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
                  {donations.length}
                </div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.45)', marginTop: '0.2rem' }}>
                  Supporters
                </div>
              </div>
            </div>
            <div className="earnings-txn-list">
              {donations.map((d) => (
                <div key={d.id} className="earnings-txn">
                  <div className="earnings-txn__icon" style={{ background: 'rgba(245,166,35,0.1)' }}>
                    💛
                  </div>
                  <div className="earnings-txn__label">
                    Donation
                    {d.event_slots?.title && (
                      <span style={{ marginLeft: '0.4rem', fontSize: '0.78rem', color: 'rgba(200,200,215,0.45)' }}>
                        · {d.event_slots.title}
                      </span>
                    )}
                  </div>
                  <div className="earnings-txn__amount" style={{ color: '#f5a623' }}>+${Number(d.amount).toFixed(2)}</div>
                  <div className="earnings-txn__date">
                    {d.created_at
                      ? formatDistanceToNow(new Date(d.created_at), { addSuffix: true })
                      : '—'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Transaction list */}
      <div>
        <h2 className="earnings-section-title">Transactions</h2>
        {earnings.length === 0 ? (
          <div className="earnings-empty">
            <p>No earnings yet.</p>
            <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
              Create events and sell tickets to start earning.
            </p>
          </div>
        ) : (
          <div className="earnings-txn-list">
            {earnings.map((e) => (
              <div key={e.id} className="earnings-txn">
                <div className="earnings-txn__icon" style={{ background: 'rgba(110,168,255,0.1)' }}>
                  {e.source === 'contest_prize' ? '🏆' : '🎟'}
                </div>
                <div className="earnings-txn__label">
                  {SOURCE_LABELS[e.source] || e.source}
                  <span style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.72rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    background: `${STATUS_COLORS[e.status] || 'rgba(255,255,255,0.1)'}22`,
                    color: STATUS_COLORS[e.status] || 'rgba(255,255,255,0.4)',
                    border: `1px solid ${STATUS_COLORS[e.status] || 'rgba(255,255,255,0.1)'}55`,
                  }}>
                    {e.status}
                  </span>
                </div>
                <div className="earnings-txn__amount">+${Number(e.amount).toFixed(2)}</div>
                <div className="earnings-txn__date">
                  {e.created_at
                    ? formatDistanceToNow(new Date(e.created_at), { addSuffix: true })
                    : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
