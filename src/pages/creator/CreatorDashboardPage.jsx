import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useMembership } from '../../modules/memberships/useMembership';

export default function CreatorDashboardPage() {
  const navigate = useNavigate();
  const { tier, loading: memberLoading } = useMembership();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isCreator = tier === 'creator_50';

  useEffect(() => {
    if (memberLoading) return;
    if (!isCreator) return;
    loadStats();
  }, [isCreator, memberLoading]);

  async function loadStats() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      const token = session.access_token;

      const [eventsRes, donationsRes, poolRes, entriesRes] = await Promise.allSettled([
        fetch('/api/creator/events/mine', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()),
        supabase.from('donations').select('id, amount', { count: 'exact' }).eq('creator_id', uid),
        fetch('/api/revenue-pool/my-earnings', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()),
        supabase.from('contest_entries').select('id', { count: 'exact' }).eq('user_id', uid),
      ]);

      const events    = eventsRes.status === 'fulfilled' ? (eventsRes.value.slots ?? []) : [];
      const donations = donationsRes.status === 'fulfilled' ? donationsRes.value : { data: [], count: 0 };
      const pool      = poolRes.status === 'fulfilled' ? poolRes.value : {};
      const entries   = entriesRes.status === 'fulfilled' ? entriesRes.value : { count: 0 };

      const donationTotal = (donations.data || []).reduce((s, d) => s + Number(d.amount), 0);

      setStats({
        eventCount:    events.length,
        donationTotal,
        donationCount: donations.count ?? 0,
        poolTotal:     pool.this_month_total ?? 0,
        poolContribs:  pool.my_contributions ?? 0,
        contestCount:  entries.count ?? 0,
      });
    } finally {
      setLoading(false);
    }
  }

  if (memberLoading) return <div style={S.page}><div style={S.spinner} className="cinematic-spinner" /></div>;

  if (!isCreator) {
    return (
      <div style={S.page}>
        <div style={S.gateCard}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
          <h2 style={S.gateTitle}>Creator Dashboard</h2>
          <p style={S.gateSub}>Upgrade to the Creator plan to access your full creator hub.</p>
          <Link to="/membership" style={S.primaryBtn}>View Membership Plans</Link>
        </div>
      </div>
    );
  }

  const ACTIONS = [
    { to: '/creator/new-event',  icon: '➕', label: 'Create Event',    color: '#a78bfa' },
    { to: '/creator/events',     icon: '📋', label: 'My Events',       color: '#60a5fa' },
    { to: '/creator/donations',  icon: '💛', label: 'Donations',       color: '#fbbf24' },
    { to: '/creator/revenue',    icon: '📈', label: 'Revenue Pool',    color: '#34d399' },
    { to: '/contests/my-entries',icon: '🏆', label: 'Contest Entries', color: '#f87171' },
    { to: '/earnings',           icon: '◎',  label: 'Earnings',        color: '#94a3b8' },
  ];

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.pageTitle}>🎬 Creator Dashboard</h1>
        <p style={S.pageSub}>Your creator hub — events, revenue, and contests at a glance.</p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <div className="cinematic-spinner" style={{ width: '2rem', height: '2rem' }} />
        </div>
      ) : stats && (
        <div style={S.statsGrid}>
          {[
            { label: 'My Events',          value: stats.eventCount,              icon: '🎬', color: '#a78bfa' },
            { label: 'Donations Received', value: `$${stats.donationTotal.toFixed(2)}`, icon: '💛', color: '#fbbf24' },
            { label: 'Supporters',         value: stats.donationCount,           icon: '❤️', color: '#f87171' },
            { label: 'Contest Entries',    value: stats.contestCount,            icon: '🏆', color: '#34d399' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={S.statCard}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{icon}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{value}</div>
              <div style={S.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <h2 style={S.sectionTitle}>Quick Actions</h2>
      <div style={S.actionsGrid}>
        {ACTIONS.map(({ to, icon, label, color }) => (
          <Link key={to} to={to} style={{ ...S.actionCard, '--ac': color }} className="creator-action-card">
            <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color }}>{label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const S = {
  page:       { maxWidth: '900px', margin: '0 auto', padding: '2rem 1.25rem' },
  spinner:    { width: '2.5rem', height: '2.5rem', margin: '4rem auto', display: 'block' },
  header:     { marginBottom: '2rem' },
  pageTitle:  { fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '0 0 0.35rem' },
  pageSub:    { color: 'rgba(200,200,215,0.5)', fontSize: '0.9rem', margin: 0 },
  statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard:   { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', textAlign: 'center' },
  statLabel:  { color: 'rgba(200,200,215,0.5)', fontSize: '0.78rem', marginTop: '0.25rem' },
  sectionTitle:{ fontSize: '1rem', fontWeight: 700, color: 'rgba(200,200,215,0.7)', margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.06em' },
  actionsGrid:{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.875rem' },
  actionCard: { background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem 1rem', textAlign: 'center', textDecoration: 'none', transition: 'border-color 0.2s, background 0.2s' },
  gateCard:   { maxWidth: '440px', margin: '4rem auto', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2.5rem 2rem', textAlign: 'center' },
  gateTitle:  { fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem' },
  gateSub:    { color: 'rgba(200,200,215,0.5)', fontSize: '0.9rem', margin: '0 0 1.5rem' },
  primaryBtn: { display: 'inline-block', padding: '0.65rem 1.5rem', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.35)', color: '#a78bfa', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' },
};
