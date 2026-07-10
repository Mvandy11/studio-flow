import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useMembership } from '../../modules/memberships/useMembership';
import { isCreatorAdmin } from '../../lib/roles';

export default function CreatorEventsPage() {
  const { role } = useAuth();
  const { tier, loading: memberLoading } = useMembership();

  const isAdmin   = isCreatorAdmin(role);
  const isCreator = tier === 'creator_50' || isAdmin;

  const [slots,   setSlots]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [deleting, setDeleting] = useState(null);

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
      const res  = await fetch('/api/creator/events/mine', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => []);
      if (!res.ok) throw new Error((json && json.error) || 'Failed to load events.');
      // API returns plain array
      setSlots(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    setDeleting(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/creator/events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setSlots(prev => prev.filter(s => s.id !== id));
      else setError('Failed to delete event.');
    } finally {
      setDeleting(null);
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
        <p style={S.gateSub}>Upgrade to Creator ($40/mo) to publish and manage events.</p>
        <Link to="/membership" style={S.primaryBtn}>View Plans →</Link>
      </div>
    );
  }

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={S.title}>My Events</h1>
          <p style={S.sub}>{slots.length} event{slots.length !== 1 ? 's' : ''} published</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <Link to="/creator/dashboard" style={S.ghostBtn}>← Dashboard</Link>
          <Link to="/creator/new-event" style={S.primaryBtn}>+ Create Event</Link>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {slots.length === 0 ? (
        <div style={S.empty}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎬</p>
          <p style={{ fontWeight: 700, marginBottom: '0.35rem' }}>No events yet</p>
          <p style={S.gateSub}>Create your first event to start building your audience.</p>
          <Link to="/creator/new-event" style={{ ...S.primaryBtn, marginTop: '1rem', display: 'inline-block' }}>+ Create Your First Event</Link>
        </div>
      ) : (
        <div style={S.grid}>
          {slots.map(slot => {
            const isLive = slot.is_live || slot.status === 'live';
            return (
              <div key={slot.id} style={S.card}>

                {/* Thumbnail */}
                <div style={{ position: 'relative' }}>
                  {slot.thumbnail_url ? (
                    <img src={slot.thumbnail_url} alt={slot.title} style={S.thumb} />
                  ) : (
                    <div style={S.thumbPlaceholder}>🎬</div>
                  )}
                  {isLive && (
                    <span style={S.liveBadge}>● Live</span>
                  )}
                </div>

                {/* Body */}
                <div style={S.cardBody}>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={S.badge}>{slot.category || 'Uncategorized'}</span>
                    {slot.video_url && <span style={{ ...S.badge, background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>🎬 Video</span>}
                  </div>

                  <div style={S.cardTitle}>{slot.title}</div>

                  {slot.description && (
                    <p style={S.cardDesc}>{slot.description}</p>
                  )}

                  <div style={S.cardDate}>
                    {new Date(slot.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', flexWrap: 'wrap' }}>
                    <Link to={`/event/${slot.id}`} style={S.actionBtn}>View →</Link>
                    <Link
                      to={`/events/${encodeURIComponent(slot.category || '')}`}
                      style={{ ...S.actionBtn, color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.08)' }}
                    >
                      Category
                    </Link>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      disabled={deleting === slot.id}
                      style={{ ...S.actionBtn, background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}
                    >
                      {deleting === slot.id ? 'Deleting…' : 'Delete'}
                    </button>
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
  page:         { maxWidth: '960px', margin: '0 auto', padding: '2rem 1.25rem' },
  title:        { fontSize: '1.7rem', fontWeight: 800, color: '#fff', margin: 0 },
  sub:          { color: 'rgba(200,200,215,0.45)', fontSize: '0.85rem', margin: '0.2rem 0 0' },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' },
  card:         { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', transition: 'border-color 0.2s' },
  thumb:        { width: '100%', height: '162px', objectFit: 'cover', display: 'block' },
  thumbPlaceholder: { width: '100%', height: '162px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' },
  liveBadge:    { position: 'absolute', top: '0.6rem', left: '0.6rem', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px', letterSpacing: '0.04em' },
  cardBody:     { padding: '1rem' },
  badge:        { fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '20px', background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.22)' },
  cardTitle:    { fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '0.3rem', lineHeight: 1.3 },
  cardDesc:     { color: 'rgba(200,200,215,0.5)', fontSize: '0.8rem', margin: '0 0 0.35rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 },
  cardDate:     { color: 'rgba(200,200,215,0.35)', fontSize: '0.73rem' },
  actionBtn:    { display: 'inline-block', padding: '0.4rem 0.875rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(220,220,235,0.75)', fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none', cursor: 'pointer' },
  primaryBtn:   { display: 'inline-block', padding: '0.6rem 1.25rem', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.35)', color: '#a78bfa', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' },
  ghostBtn:     { display: 'inline-block', padding: '0.6rem 1.1rem', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(200,200,215,0.55)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' },
  empty:        { textAlign: 'center', padding: '3rem 2rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px', color: '#fff' },
  gate:         { maxWidth: '400px', margin: '4rem auto', textAlign: 'center', padding: '2rem' },
  gateTitle:    { fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 0.4rem' },
  gateSub:      { color: 'rgba(200,200,215,0.5)', fontSize: '0.88rem', margin: 0 },
};
