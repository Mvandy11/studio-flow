import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';   // ⭐ NEW
import { isCreatorAdmin } from '../../lib/roles';

export default function CreatorDashboardPage() {
  const { user, role, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();   // ⭐ NEW

  const isAdmin = isCreatorAdmin(role);

  // ⭐ Correct creator logic using new membership fields
  const isCreator =
    (profile?.membership_active && profile?.membership_tier === 'creator_50') ||
    isAdmin;

  const [stats, setStats] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileLoading) return;
    if (!isCreator) { setLoading(false); return; }
    loadStats();
  }, [isCreator, profileLoading]);


  async function loadStats() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid   = session.user.id;
      const token = session.access_token;

      const [eventsRes, donationsRes, poolRes, entriesRes] = await Promise.allSettled([
        fetch('/api/creator/events/mine', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()),
        supabase.from('donations').select('id, amount', { count: 'exact' }).eq('creator_id', uid),
        fetch('/api/revenue-pool/my-earnings', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()),
        supabase.from('contest_entries').select('id', { count: 'exact' }).eq('user_id', uid),
      ]);

      // API returns plain array (not { slots: [...] })
      const events    = eventsRes.status === 'fulfilled' && Array.isArray(eventsRes.value) ? eventsRes.value : [];
      const donations = donationsRes.status === 'fulfilled' ? donationsRes.value : { data: [], count: 0 };
      const pool      = poolRes.status === 'fulfilled' ? poolRes.value : {};
      const entries   = entriesRes.status === 'fulfilled' ? entriesRes.value : { count: 0 };

      const donationTotal = (donations.data || []).reduce((s, d) => s + Number(d.amount), 0);

      setStats({
        eventCount:    events.length,
        donationTotal,
        donationCount: donations.count ?? 0,
        poolTotal:     pool.this_month_total ?? 0,
        allTimePool:   pool.all_time_total ?? 0,
        contestCount:  entries.count ?? 0,
      });
      setRecentEvents(events.slice(0, 5));
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return <div style={S.page}><div className="cinematic-spinner" style={{ width: '2rem', height: '2rem', margin: '4rem auto', display: 'block' }} /></div>;
  }

  if (!user) {
    return (
      <div style={S.page}>
        <div style={S.gateCard}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
          <h2 style={S.gateTitle}>Creator Dashboard</h2>
          <p style={S.gateSub}>Log in to access your Creator Dashboard.</p>
          <Link to="/login" style={S.primaryBtn}>Log In</Link>
        </div>
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div style={S.page}>
        <div style={S.gateCard}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
          <h2 style={S.gateTitle}>Creator Dashboard</h2>
          <p style={S.gateSub}>Upgrade to the Creator plan ($40/mo) to access your full creator hub.</p>
          <Link to="/membership" style={S.primaryBtn}>View Membership Plans →</Link>
        </div>
      </div>
    );
  }

  const ACTIONS = [
    { to: '/creator/new-event',   icon: '➕', label: 'Create Event',    color: '#a78bfa' },
    { to: '/creator/events',      icon: '📋', label: 'My Events',       color: '#60a5fa' },
    { to: '/creator/donations',   icon: '💛', label: 'Donations',       color: '#fbbf24' },
    { to: '/creator/revenue',     icon: '📈', label: 'Revenue Pool',    color: '#34d399' },
    { to: '/contests/my-entries', icon: '🏆', label: 'Contest Entries', color: '#f87171' },
    { to: '/earnings',            icon: '◎',  label: 'Earnings',        color: '#94a3b8' },
  ];

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={S.pageTitle}>🎬 Creator Dashboard</h1>
        <p style={S.pageSub}>Your creator hub — events, revenue, and contests at a glance.</p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ ...S.statCard, height: '90px' }} />
          ))}
        </div>
      ) : stats && (
        <div style={S.statsGrid}>
          {[
            { label: 'My Events',          value: stats.eventCount,                        icon: '🎬', color: '#a78bfa' },
            { label: 'Donations Received', value: `$${stats.donationTotal.toFixed(2)}`,    icon: '💛', color: '#fbbf24' },
            { label: 'Supporters',         value: stats.donationCount,                     icon: '❤️', color: '#f87171' },
            { label: 'Pool This Month',    value: `$${stats.poolTotal.toFixed(2)}`,         icon: '📈', color: '#34d399' },
            { label: 'Pool All Time',      value: `$${stats.allTimePool.toFixed(2)}`,       icon: '◎',  color: '#60a5fa' },
            { label: 'Contest Entries',    value: stats.contestCount,                      icon: '🏆', color: '#e879f9' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={S.statCard}>
              <div style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>{icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
              <div style={S.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <h2 style={S.sectionTitle}>Quick Actions</h2>
      <div style={S.actionsGrid}>
        {ACTIONS.map(({ to, icon, label, color }) => (
          <Link
            key={to}
            to={to}
            style={{ ...S.actionCard, textDecoration: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}55`; e.currentTarget.style.background = `${color}0d`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.035)'; }}
          >
            <div style={{ fontSize: '1.65rem', marginBottom: '0.4rem' }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color }}>{label}</div>
          </Link>
        ))}
      </div>

      {/* Recent Events */}
      {!loading && recentEvents.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2rem 0 1rem' }}>
            <h2 style={{ ...S.sectionTitle, margin: 0 }}>Recent Events</h2>
            <Link to="/creator/events" style={{ fontSize: '0.8rem', color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>
              View All →
            </Link>
          </div>
          <div style={S.eventsList}>
            {recentEvents.map(slot => (
              <div key={slot.id} style={S.eventRow}>
                {slot.thumbnail_url ? (
                  <img src={slot.thumbnail_url} alt={slot.title} style={S.eventThumb} />
                ) : (
                  <div style={{ ...S.eventThumb, background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>🎬</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {slot.title}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {slot.category && <span style={S.pill}>{slot.category}</span>}
                    {slot.is_live  && <span style={{ ...S.pill, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>🔴 Live</span>}
                    <span style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.35)' }}>
                      {new Date(slot.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Link to={`/event/${slot.id}`} style={S.viewBtn}>View</Link>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && stats?.eventCount === 0 && (
        <div style={S.emptyEvents}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎬</p>
          <p style={{ fontWeight: 700, marginBottom: '0.35rem' }}>No events yet</p>
          <p style={S.pageSub}>Create your first event and start building your audience.</p>
          <Link to="/creator/new-event" style={{ ...S.primaryBtn, marginTop: '1rem', display: 'inline-block' }}>+ Create Event</Link>
        </div>
      )}
    </div>
  );
}

const S = {
  page:        { maxWidth: '960px', margin: '0 auto', padding: '2rem 1.25rem' },
  pageTitle:   { fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '0 0 0.3rem' },
  pageSub:     { color: 'rgba(200,200,215,0.5)', fontSize: '0.9rem', margin: 0 },
  statsGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '0.875rem', marginBottom: '2rem' },
  statCard:    { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.125rem', textAlign: 'center', transition: 'border-color 0.2s' },
  statLabel:   { color: 'rgba(200,200,215,0.45)', fontSize: '0.75rem', marginTop: '0.25rem' },
  sectionTitle:{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(200,200,215,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.875rem' },
  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.875rem' },
  actionCard:  { background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem 1rem', textAlign: 'center', transition: 'border-color 0.18s, background 0.18s' },
  eventsList:  { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  eventRow:    { display: 'flex', alignItems: 'center', gap: '0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '0.75rem 1rem' },
  eventThumb:  { width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 },
  pill:        { fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '20px', background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.22)' },
  viewBtn:     { display: 'inline-block', padding: '0.35rem 0.875rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(220,220,235,0.75)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', flexShrink: 0 },
  emptyEvents: { marginTop: '2rem', textAlign: 'center', padding: '2.5rem 2rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '14px', color: '#fff' },
  gateCard:    { maxWidth: '440px', margin: '4rem auto', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2.5rem 2rem', textAlign: 'center' },
  gateTitle:   { fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem' },
  gateSub:     { color: 'rgba(200,200,215,0.5)', fontSize: '0.9rem', margin: '0 0 1.5rem' },
  primaryBtn:  { display: 'inline-block', padding: '0.65rem 1.5rem', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.35)', color: '#a78bfa', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' },
};
