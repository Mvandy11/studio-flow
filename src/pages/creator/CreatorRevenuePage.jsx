import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useMembership } from '../../modules/memberships/useMembership';
import { isCreatorAdmin } from '../../lib/roles';

export default function CreatorRevenuePage() {
  const { role } = useAuth();
  const { tier, loading: memberLoading } = useMembership();

  const isAdmin   = isCreatorAdmin(role);
  const isCreator = tier === 'creator_50' || isAdmin;

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (memberLoading || !isCreator) { setLoading(false); return; }
    loadData();
  }, [isCreator, memberLoading]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res  = await fetch('/api/revenue-pool/my-earnings', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load revenue data.');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (memberLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="cinematic-spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div style={S.gate}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔒</div>
        <h2 style={S.gateTitle}>Creator access required</h2>
        <p style={S.gateSub}>Upgrade to Creator to access the revenue pool.</p>
        <Link to="/membership" style={S.primaryBtn}>View Plans →</Link>
      </div>
    );
  }

  const entries      = data?.entries ?? [];
  const allTimeTotal = Number(data?.all_time_total ?? 0);
  const monthTotal   = Number(data?.this_month_total ?? 0);
  const poolTotal    = Number(data?.pool_total ?? 0);

  /* Breakdown: subscription vs donation contributions */
  const breakdown = entries.reduce(
    (acc, e) => {
      const src = e.source === 'subscription' ? 'subscription' : 'donation';
      acc[src] = (acc[src] || 0) + Number(e.amount);
      return acc;
    },
    { subscription: 0, donation: 0 }
  );

  /* Monthly grouping */
  const byMonth = entries.reduce((acc, e) => {
    const key = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    acc[key]  = (acc[key] || 0) + Number(e.amount);
    return acc;
  }, {});

  const subscriptionPct = allTimeTotal > 0 ? (breakdown.subscription / allTimeTotal) * 100 : 0;
  const donationPct     = allTimeTotal > 0 ? (breakdown.donation     / allTimeTotal) * 100 : 0;

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={S.title}>📈 Revenue Pool</h1>
          <p style={S.sub}>Your share of the Studio Flow community revenue pool.</p>
        </div>
        <Link to="/creator/dashboard" style={S.ghostBtn}>← Dashboard</Link>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div style={S.statsGrid}>
        {[
          { label: 'This Month',   value: `$${monthTotal.toFixed(2)}`,   color: '#a78bfa', icon: '🗓' },
          { label: 'All Time',     value: `$${allTimeTotal.toFixed(2)}`, color: '#60a5fa', icon: '◎' },
          { label: 'Total Pool',   value: `$${poolTotal.toFixed(2)}`,    color: '#34d399', icon: '🌐' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={S.statCard}>
            <div style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>{icon}</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color }}>{value}</div>
            <div style={S.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Breakdown: Subscription vs Donation */}
      <h2 style={S.sectionTitle}>Revenue Breakdown</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem', marginBottom: '2rem' }}>

        {/* Subscription contributions */}
        <div style={S.breakdownCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🟣</span>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#a78bfa' }}>Subscription</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a78bfa', marginBottom: '0.25rem' }}>
            ${breakdown.subscription.toFixed(2)}
          </div>
          <div style={S.statLabel}>
            {subscriptionPct.toFixed(0)}% of your total
          </div>
          <div style={{ marginTop: '0.75rem', height: '5px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${subscriptionPct}%`, background: '#a78bfa', borderRadius: '999px', transition: 'width 0.6s ease' }} />
          </div>
          <p style={{ marginTop: '0.6rem', fontSize: '0.73rem', color: 'rgba(200,200,215,0.35)', lineHeight: 1.4 }}>
            Your share from member subscription revenue each billing cycle.
          </p>
        </div>

        {/* Donation contributions */}
        <div style={S.breakdownCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>💛</span>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fbbf24' }}>Donations</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.25rem' }}>
            ${breakdown.donation.toFixed(2)}
          </div>
          <div style={S.statLabel}>
            {donationPct.toFixed(0)}% of your total
          </div>
          <div style={{ marginTop: '0.75rem', height: '5px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${donationPct}%`, background: '#fbbf24', borderRadius: '999px', transition: 'width 0.6s ease' }} />
          </div>
          <p style={{ marginTop: '0.6rem', fontSize: '0.73rem', color: 'rgba(200,200,215,0.35)', lineHeight: 1.4 }}>
            Direct donations from viewers on your event pages.
          </p>
        </div>
      </div>

      {/* Monthly breakdown */}
      {Object.keys(byMonth).length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={S.sectionTitle}>Monthly Earnings</h2>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {Object.entries(byMonth).map(([month, amt]) => (
              <div key={month} style={{ padding: '0.6rem 1rem', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '10px', textAlign: 'center', minWidth: '90px' }}>
                <div style={{ fontWeight: 800, color: '#a78bfa', fontSize: '0.95rem' }}>${amt.toFixed(2)}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.4)', marginTop: '0.1rem' }}>{month}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry history */}
      <h2 style={S.sectionTitle}>Contribution History</h2>
      {entries.length === 0 ? (
        <div style={S.empty}>
          <p style={{ marginBottom: '0.35rem', fontWeight: 700 }}>No contributions yet</p>
          <p style={S.sub}>
            Your pool share accumulates monthly from subscriptions and direct donations.
            Post more events to grow your audience and earnings.
          </p>
          <Link to="/creator/new-event" style={{ ...S.primaryBtn, marginTop: '1rem', display: 'inline-block' }}>+ Post an Event →</Link>
        </div>
      ) : (
        <div style={S.list}>
          {entries.map(entry => {
            const isSub   = entry.source === 'subscription';
            const color   = isSub ? '#a78bfa' : '#fbbf24';
            const icon    = isSub ? '🟣' : '💛';
            const srcLabel = isSub ? 'Subscription' : 'Donation';
            return (
              <div key={entry.id} style={S.row}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color }}>{srcLabel}</div>
                    <div style={S.rowDate}>
                      {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 800, color: '#34d399', fontSize: '0.95rem' }}>
                  +${Number(entry.amount).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const S = {
  page:         { maxWidth: '760px', margin: '0 auto', padding: '2rem 1.25rem' },
  title:        { fontSize: '1.7rem', fontWeight: 800, color: '#fff', margin: 0 },
  sub:          { color: 'rgba(200,200,215,0.45)', fontSize: '0.88rem', margin: '0.2rem 0 0' },
  statsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard:     { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', textAlign: 'center' },
  statLabel:    { color: 'rgba(200,200,215,0.45)', fontSize: '0.78rem', marginTop: '0.3rem' },
  breakdownCard:{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem 1.5rem' },
  sectionTitle: { fontSize: '0.75rem', fontWeight: 700, color: 'rgba(200,200,215,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.875rem' },
  list:         { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  row:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '0.875rem 1rem' },
  rowDate:      { color: 'rgba(200,200,215,0.4)', fontSize: '0.73rem' },
  empty:        { padding: '2.5rem 2rem', textAlign: 'center', color: 'rgba(200,200,215,0.5)', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '14px' },
  gate:         { maxWidth: '400px', margin: '4rem auto', textAlign: 'center', padding: '2rem' },
  gateTitle:    { fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 0.4rem' },
  gateSub:      { color: 'rgba(200,200,215,0.5)', fontSize: '0.88rem', margin: 0 },
  primaryBtn:   { display: 'inline-block', padding: '0.6rem 1.25rem', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.35)', color: '#a78bfa', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' },
  ghostBtn:     { display: 'inline-block', padding: '0.55rem 1rem', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(200,200,215,0.5)', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none' },
};
