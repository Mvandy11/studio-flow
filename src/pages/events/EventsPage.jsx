import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isCreatorAdmin } from '../../lib/roles';
import API_BASE from '../../lib/apiBase.js';

const TYPE_FILTERS = [
  { value: '',         label: 'All' },
  { value: 'live',     label: '📡 Live' },
  { value: 'recorded', label: '🎬 Recorded' },
];

const STATUS_FILTERS = [
  { value: '',         label: 'All Status' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'live',     label: 'Live Now' },
  { value: 'ended',    label: 'Ended' },
];

const STATUS_BADGE = {
  live:      { label: '🔴 Live Now',  color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  upcoming:  { label: '📅 Upcoming',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  ended:     { label: '✅ Ended',      color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
  cancelled: { label: '🚫 Cancelled', color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
};

function EventCard({ event }) {
  const status   = event.status || 'upcoming';
  const badge    = STATUS_BADGE[status] ?? STATUS_BADGE.upcoming;
  const isLive   = event.event_type === 'live' || (!event.event_type && event.stage_room_id);
  const price    = Number(event.price ?? event.ticket_price ?? 0);
  const dateStr  = event.start_time || event.starts_at
    ? new Date(event.start_time || event.starts_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : event.date || null;

  return (
    <Link to={`/events/${event.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', overflow: 'hidden', height: '100%',
        transition: 'border-color 0.2s, transform 0.2s',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; }}
      >
        {/* Thumbnail */}
        <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: 'linear-gradient(135deg,#1a1a2e,#16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', position: 'relative' }}>
          {event.thumbnail_url || event.image_url
            ? <img src={event.thumbnail_url || event.image_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            : (isLive ? '📡' : '🎬')}
          {/* Live pulse indicator */}
          {status === 'live' && (
            <span style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', background: '#f87171', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', animation: 'pulse 2s infinite' }}>
              ● Live
            </span>
          )}
        </div>

        <div style={{ padding: '1rem 1.125rem' }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, background: badge.bg, color: badge.color, border: `1px solid ${badge.color}44` }}>
              {badge.label}
            </span>
            <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, background: isLive ? 'rgba(167,139,250,0.12)' : 'rgba(52,211,153,0.12)', color: isLive ? '#a78bfa' : '#34d399' }}>
              {isLive ? 'Live' : 'Recorded'}
            </span>
          </div>

          <p style={{ margin: '0 0 0.3rem', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>
            {event.title}
          </p>
          {event.description && (
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', color: 'rgba(200,200,215,0.5)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {event.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)' }}>
              {dateStr ? `📅 ${dateStr}` : (event.location ? `📍 ${event.location}` : '')}
            </span>
            <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, background: price === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(245,166,35,0.12)', color: price === 0 ? '#22c55e' : '#f5a623' }}>
              {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function EventsPage() {
  const { role } = useAuth();
  const [events,     setEvents]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilt, setStatusFilt] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (typeFilter) params.set('event_type', typeFilter);
        if (statusFilt) params.set('status', statusFilt);
        const res  = await fetch(`${API_BASE}/api/events?${params}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load events.');
        setEvents(Array.isArray(json.data) ? json.data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [typeFilter, statusFilt]);

  const liveEvents     = events.filter((e) => e.event_type === 'live'     || (!e.event_type && e.stage_room_id));
  const recordedEvents = events.filter((e) => e.event_type === 'recorded' || (!e.event_type && !e.stage_room_id));
  const grouped = typeFilter
    ? [{ label: null, list: events }]
    : [
        { label: liveEvents.length     ? '📡 Live Events'     : null, list: liveEvents },
        { label: recordedEvents.length ? '🎬 Pre‑Recorded'    : null, list: recordedEvents },
      ].filter((g) => g.list.length > 0);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">🎟 Events</h1>
          <p className="page-subtitle">Browse upcoming live sessions and pre‑recorded creator events.</p>
        </div>
        {isCreatorAdmin(role) && (
          <Link to="/events/create" className="btn btn--primary" style={{ textDecoration: 'none', flexShrink: 0 }}>
            + Create Event
          </Link>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {TYPE_FILTERS.map((f) => (
          <button key={f.value} onClick={() => setTypeFilter(f.value)}
            className={`ai-grid__filter${typeFilter === f.value ? ' ai-grid__filter--active' : ''}`}>
            {f.label}
          </button>
        ))}
        <span style={{ width: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 0.25rem' }} />
        {STATUS_FILTERS.map((f) => (
          <button key={f.value} onClick={() => setStatusFilt(f.value)}
            className={`ai-grid__filter${statusFilt === f.value ? ' ai-grid__filter--active' : ''}`}>
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fca5a5', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '280px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px', padding: '3rem 2rem' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎟</p>
          <p style={{ fontWeight: 700, marginBottom: '0.4rem' }}>No events scheduled yet</p>
          <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Check back soon or request a custom event slot.
          </p>
          <Link to="/custom-event-request" className="btn btn--primary" style={{ textDecoration: 'none' }}>
            Request Custom Event
          </Link>
        </div>
      ) : (
        grouped.map(({ label, list }) => (
          <div key={label || 'all'} style={{ marginBottom: '2.5rem' }}>
            {label && <h2 className="hub-section-title" style={{ marginBottom: '1rem' }}>{label}</h2>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {list.map((ev) => <EventCard key={ev.id} event={ev} />)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
