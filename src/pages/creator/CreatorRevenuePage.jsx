import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useMembership } from '../../modules/memberships/useMembership';

export default function CreatorRevenuePage() {
  const { tier, loading: memberLoading } = useMembership();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const isCreator = tier === 'creator_50';

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
      const res  = await fetch('/api/revenue-pool/my-earnings', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load revenue data.');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (memberLoading || loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="cinematic-spinner" style={{ width: '2rem', height: '2rem' }} />
    </div>
  );

  if (!isCreator) return (
    <div style={S.gate}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔒</div>
      <h2 style={S.gateTitle}>Creator access required</h2>
      <p style={S.gateSub}>Upgrade to Creator to access the revenue pool.</p>
      <Link to="/membership" style={S.primaryBtn}>View Plans</Link>
    </div>
  );

  const entries       = data?.entries ?? [];
  const allTimeTotal  = data?.all_time_total ?? 0;
  const monthTotal    = data?.this_month_total ?? 0;
  const poolTotal     = data?.pool_total ?? 0;

  return (
    <div style={S.page}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={S.title}>📈 Revenue Pool</h1>
        <p style={S.sub}>Your share of the Studio Flow community revenue pool.</p>
      </div>

      {error && <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>{error}</p>}

      {/* Summary cards */}
      <div style={S.statsGrid}>
        {[
          { label: 'My This Month',   value: `$${Number(monthTotal).toFixed(2)}`,   color: '#a78bfa' },
          { label: 'My All Time',     value: `$${Number(allTimeTotal).toFixed(2)}`, color: '#60a5fa' },
          { label: 'Total Pool',      value: `$${Number(poolTotal).toFixed(2)}`,    color: '#34d399' },
        ].map(({ label, value, color }) => (
          <div key={label} style={S.statCard}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
            <div style={S.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Entries */}
      <h2 style={S.sectionTitle}>Contribution History</h2>
      {entries.length === 0 ? (
        <div style={S.empty}>
          <p style={{ marginBottom: '0.35rem', fontWeight: 700 }}>No contributions yet</p>
          <p style={S.sub}>Your $25/month subscription and received donations will appear here.</p>
        </div>
      ) : (
        <div style={S.list}>
          {entries.map(entry => (
            <div key={entry.id} style={S.row}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{entry.source === 'subscription' ? '🟣' : '💛'}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', textTransform: 'capitalize' }}>{entry.source}</div>
                  <div style={S.rowDate}>{new Date(entry.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ fontWeight: 800, color: '#34d399', fontSize: '1rem' }}>${Number(entry.amount).toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const S = {
  page:       { maxWidth: '760px', margin: '0 auto', padding: '2rem 1.25rem' },
  title:      { fontSize: '1.7rem', fontWeight: 800, color: '#fff', margin: 0 },
  sub:        { color: 'rgba(200,200,215,0.45)', fontSize: '0.88rem', margin: '0.2rem 0 0' },
  statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard:   { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', textAlign: 'center' },
  statLabel:  { color: 'rgba(200,200,215,0.45)', fontSize: '0.78rem', marginTop: '0.3rem' },
  sectionTitle: { fontSize: '0.78rem', fontWeight: 700, color: 'rgba(200,200,215,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.875rem' },
  list:       { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  row:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '0.9rem 1rem' },
  rowDate:    { color: 'rgba(200,200,215,0.4)', fontSize: '0.76rem' },
  empty:      { padding: '2rem', textAlign: 'center', color: 'rgba(200,200,215,0.5)', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '14px' },
  gate:       { maxWidth: '400px', margin: '4rem auto', textAlign: 'center', padding: '2rem' },
  gateTitle:  { fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 0.4rem' },
  gateSub:    { color: 'rgba(200,200,215,0.5)', fontSize: '0.88rem', margin: 0 },
  primaryBtn: { display: 'inline-block', marginTop: '1rem', padding: '0.6rem 1.25rem', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.35)', color: '#a78bfa', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' },
};
