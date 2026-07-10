import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useMembership } from '../../modules/memberships/useMembership';
import { isCreatorAdmin } from '../../lib/roles';

export default function CreatorDonationsPage() {
  const { role } = useAuth();
  const { tier, loading: memberLoading } = useMembership();

  const isAdmin   = isCreatorAdmin(role);
  const isCreator = tier === 'creator_50' || isAdmin;

  const [donations, setDonations] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

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
        .select(`
          id, amount, created_at, event_id,
          donor_name, donor_email,
          event_slots:event_id ( id, title, category )
        `)
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
        <p style={S.gateSub}>Upgrade to Creator to receive and track donations.</p>
        <Link to="/membership" style={S.primaryBtn}>View Plans →</Link>
      </div>
    );
  }

  const total      = donations.reduce((s, d) => s + Number(d.amount), 0);
  const supporters = donations.length;
  const avgDon     = supporters > 0 ? total / supporters : 0;

  /* group by month for mini breakdown */
  const byMonth = donations.reduce((acc, d) => {
    const key = new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    acc[key]  = (acc[key] || 0) + Number(d.amount);
    return acc;
  }, {});

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={S.title}>💛 Donations</h1>
          <p style={S.sub}>Support from the Studio Flow community.</p>
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
          { label: 'Total Received', value: `$${total.toFixed(2)}`,   color: '#fbbf24', icon: '💛' },
          { label: 'Supporters',     value: supporters,                color: '#f87171', icon: '❤️' },
          { label: 'Avg Donation',   value: `$${avgDon.toFixed(2)}`,  color: '#60a5fa', icon: '◎' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={S.statCard}>
            <div style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>{icon}</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color }}>{value}</div>
            <div style={S.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Monthly breakdown (if data exists) */}
      {Object.keys(byMonth).length > 1 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={S.sectionTitle}>By Month</h2>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {Object.entries(byMonth).map(([month, amt]) => (
              <div key={month} style={{ padding: '0.6rem 1rem', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '10px', textAlign: 'center', minWidth: '90px' }}>
                <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.95rem' }}>${amt.toFixed(2)}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.4)', marginTop: '0.1rem' }}>{month}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Donation list */}
      <h2 style={S.sectionTitle}>Donation History</h2>

      {donations.length === 0 ? (
        <div style={S.empty}>
          <p style={{ marginBottom: '0.35rem', fontWeight: 700 }}>No donations yet</p>
          <p style={S.sub}>Donations from your event viewers will appear here once received.</p>
          <Link to="/creator/events" style={{ ...S.primaryBtn, marginTop: '0.875rem', display: 'inline-block' }}>View My Events →</Link>
        </div>
      ) : (
        <div style={S.list}>
          {donations.map(d => {
            const event      = d.event_slots;
            const donorName  = d.donor_name || 'Anonymous supporter';
            return (
              <div key={d.id} style={S.row}>
                {/* Left: info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>💛</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>
                      {donorName}
                    </div>
                    {event?.title && (
                      <Link to={`/event/${event.id}`} style={{ color: '#a78bfa', fontSize: '0.76rem', textDecoration: 'none', fontWeight: 500 }}>
                        {event.title}
                      </Link>
                    )}
                    {!event?.title && (
                      <span style={{ color: 'rgba(200,200,215,0.35)', fontSize: '0.76rem' }}>General donation</span>
                    )}
                  </div>
                </div>

                {/* Right: amount + date */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '1rem' }}>
                    ${Number(d.amount).toFixed(2)}
                  </div>
                  <div style={S.rowDate}>
                    {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
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
  page:        { maxWidth: '760px', margin: '0 auto', padding: '2rem 1.25rem' },
  title:       { fontSize: '1.7rem', fontWeight: 800, color: '#fff', margin: 0 },
  sub:         { color: 'rgba(200,200,215,0.45)', fontSize: '0.88rem', margin: '0.2rem 0 0' },
  statsGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard:    { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', textAlign: 'center' },
  statLabel:   { color: 'rgba(200,200,215,0.45)', fontSize: '0.78rem', marginTop: '0.3rem' },
  sectionTitle:{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(200,200,215,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.875rem' },
  list:        { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  row:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '0.875rem 1rem' },
  rowDate:     { color: 'rgba(200,200,215,0.35)', fontSize: '0.73rem', marginTop: '0.1rem' },
  empty:       { padding: '2.5rem 2rem', textAlign: 'center', color: 'rgba(200,200,215,0.5)', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '14px' },
  gate:        { maxWidth: '400px', margin: '4rem auto', textAlign: 'center', padding: '2rem' },
  gateTitle:   { fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 0.4rem' },
  gateSub:     { color: 'rgba(200,200,215,0.5)', fontSize: '0.88rem', margin: 0 },
  primaryBtn:  { display: 'inline-block', padding: '0.6rem 1.25rem', borderRadius: '10px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' },
  ghostBtn:    { display: 'inline-block', padding: '0.55rem 1rem', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(200,200,215,0.5)', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none' },
};
