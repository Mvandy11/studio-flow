import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useMembership } from '../../modules/memberships/useMembership';

export default function CreatorEventsPage() {
  const { tier, loading: memberLoading } = useMembership();
  const [slots, setSlots]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const isCreator = tier === 'creator_50';

  useEffect(() => {
    if (memberLoading || !isCreator) { setLoading(false); return; }
    loadSlots();
  }, [isCreator, memberLoading]);

  async function loadSlots() {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res  = await fetch('/api/creator/events/mine', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load events.');
      setSlots(json.slots ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this event?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`/api/creator/events/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } });
    setSlots(prev => prev.filter(s => s.id !== id));
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
      <p style={S.gateSub}>Upgrade to Creator to publish events.</p>
      <Link to="/membership" style={S.btn}>View Plans</Link>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={S.title}>My Events</h1>
          <p style={S.sub}>{slots.length} event{slots.length !== 1 ? 's' : ''} published</p>
        </div>
        <Link to="/creator/new-event" style={S.primaryBtn}>+ Create Event</Link>
      </div>

      {error && <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>{error}</p>}

      {slots.length === 0 ? (
        <div style={S.empty}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎬</p>
          <p style={{ fontWeight: 700, marginBottom: '0.35rem' }}>No events yet</p>
          <p style={S.gateSub}>Create your first event to get started.</p>
          <Link to="/creator/new-event" style={{ ...S.btn, marginTop: '1rem' }}>+ Create Event</Link>
        </div>
      ) : (
        <div style={S.grid}>
          {slots.map(slot => (
            <div key={slot.id} style={S.card}>
              {slot.thumbnail_url ? (
                <img src={slot.thumbnail_url} alt={slot.title} style={S.thumb} />
              ) : (
                <div style={S.thumbPlaceholder}>🎬</div>
              )}
              <div style={S.cardBody}>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={S.badge}>{slot.category || 'Uncategorized'}</span>
                  {slot.is_live && <span style={{ ...S.badge, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>🔴 Live</span>}
                </div>
                <div style={S.cardTitle}>{slot.title}</div>
                {slot.description && <p style={S.cardDesc}>{slot.description}</p>}
                <div style={S.cardDate}>{new Date(slot.created_at).toLocaleDateString()}</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <Link to={`/event/${slot.id}`} style={S.btn}>View</Link>
                  <button onClick={() => handleDelete(slot.id)} style={{ ...S.btn, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const S = {
  page:        { maxWidth: '960px', margin: '0 auto', padding: '2rem 1.25rem' },
  title:       { fontSize: '1.7rem', fontWeight: 800, color: '#fff', margin: 0 },
  sub:         { color: 'rgba(200,200,215,0.45)', fontSize: '0.85rem', margin: '0.2rem 0 0' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' },
  card:        { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' },
  thumb:       { width: '100%', height: '160px', objectFit: 'cover', display: 'block' },
  thumbPlaceholder: { width: '100%', height: '160px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' },
  cardBody:    { padding: '1rem' },
  badge:       { fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '20px', background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.22)' },
  cardTitle:   { fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: '0.35rem' },
  cardDesc:    { color: 'rgba(200,200,215,0.5)', fontSize: '0.82rem', margin: '0 0 0.35rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardDate:    { color: 'rgba(200,200,215,0.35)', fontSize: '0.75rem' },
  btn:         { display: 'inline-block', padding: '0.45rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(220,220,235,0.8)', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none', cursor: 'pointer' },
  primaryBtn:  { display: 'inline-block', padding: '0.6rem 1.25rem', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.35)', color: '#a78bfa', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' },
  empty:       { textAlign: 'center', padding: '3rem 2rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px', color: '#fff' },
  gate:        { maxWidth: '400px', margin: '4rem auto', textAlign: 'center', padding: '2rem' },
  gateTitle:   { fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 0.4rem' },
  gateSub:     { color: 'rgba(200,200,215,0.5)', fontSize: '0.88rem', margin: 0 },
};
