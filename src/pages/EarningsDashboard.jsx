import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
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

export default function EarningsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [earnings,     setEarnings]     = useState([]);
  const [settings,     setSettings]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [requesting,   setRequesting]   = useState(false);
  const [requestMsg,   setRequestMsg]   = useState('');

  useEffect(() => {
    if (authLoading || !user) return;

    Promise.all([
      supabase
        .from('earnings')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('creator_settings')
        .select('payout_method, paypal, cashapp, venmo, stripe, kofi_page, custom_url')
        .eq('creator_id', user.id)
        .maybeSingle(),
    ]).then(([earningsRes, settingsRes]) => {
      setEarnings(earningsRes.data || []);
      setSettings(settingsRes.data || null);
      setLoading(false);
    });
  }, [authLoading, user]);

  async function handleRequestPayout() {
    if (!user) return;
    setRequesting(true);
    setRequestMsg('');
    try {
      const res = await fetch('/api/payouts/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRequestMsg(json.error || 'Request failed.');
      } else {
        setRequestMsg(`Payout requested for ${json.rowsUpdated} earning(s). We'll process it shortly.`);
        // Optimistically update status in UI
        setEarnings((prev) =>
          prev.map((e) => e.status === 'pending' ? { ...e, status: 'requested' } : e)
        );
      }
    } catch {
      setRequestMsg('Network error — please try again.');
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

  const payoutMethodLabel = settings?.payout_method
    ? settings.payout_method.replace('studioflow-kofi', 'Studio Flow Ko-fi')
                             .replace('my-kofi', 'My Ko-fi Page')
                             .replace('custom', 'Custom Link')
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
        <p className="page-subtitle">Your revenue summary. You keep 80% of every ticket sale.</p>
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
