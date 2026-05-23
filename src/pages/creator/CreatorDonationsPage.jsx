import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useMembership } from '../../modules/memberships/useMembership';

export default function CreatorDonationsPage() {
  const { tier, loading: memberLoading } = useMembership();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const isCreator = tier === 'creator_50';

  useEffect(() => {
    if (memberLoading || !isCreator) { setLoading(false); return; }
    loadDonations();
  }, [isCreator, memberLoading]);

  async function loadDonations() {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error: err } = await supabase
        .from('donations')
        .select('id, amount, created_at, event_id, event_slots:event_id ( title )')
        .eq('creator_id', session.user.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setDonations(data || []);
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
      <p style={S.gateSub}>Upgrade to Creator to receive and track donations.</p>
      <Link to="/membership" style={S.primaryBtn}>View Plans</Link>
    </div>
  );

  const total      = donations.reduce((s, d) => s + Number(d.amount), 0);
  const supporters = donations.length;

  return (
    <div style={S.page}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={S.title}>💛 Donations Received</h1>
        <p style={S.sub}>Support from the Studio Flow community.</p>
      </div>

      {error && <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>{error}</p>}

      {/* Summary */}
      <div style={S.statsGrid}>
        <div style={S.statCard}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>${total.toFixed(2)}</div>
          <div style={S.statLabel}>Total Received</div>
        </div>
        <div style={S.statCard}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>{supporters}</div>
          <div style={S.statLabel}>Supporters</div>
        </div>
        <div style={S.statCard}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa' }}>
            {supporters > 0 ? `$${(total / supporters).toFixed(2)}` : '—'}
          </div>
          <div style={S.statLabel}>Avg per Donation</div>
        </div>
      </div>

      {/* List */}
      <h2 style={S.sectionTitle}>Donation History</h2>
      {donations.length === 0 ? (
        <div style={S.empty}>
          <p style={{ marginBottom: '0.35rem', fontWeight: 700 }}>No donations yet</p>
          <p style={S.sub}>Donations from your event viewers will appear here.</p>
          <Link to="/creator/events" style={{ ...S.primaryBtn, marginTop: '0.875rem' }}>View My Events</Link>
        </div>
      ) : (
        <div style={S.list}>
          {donations.map(d => (
            <div key={d.id} style={S.row}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.1rem' }}>💛</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                    {d.event_slots?.title ?? 'General donation'}
                  </div>
                  <div style={S.rowDate}>{new Date(d.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '1rem' }}>${Number(d.amount).toFixed(2)}</div>
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
  statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' },
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
  primaryBtn: { display: 'inline-block', padding: '0.6rem 1.25rem', borderRadius: '10px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' },
};
