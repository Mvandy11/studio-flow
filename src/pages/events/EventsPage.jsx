import { useEffect, useState } from 'react';
import { Link, useParams }     from 'react-router-dom';
import { useAuth }             from '../../hooks/useAuth';
import { useMembership }       from '../../modules/memberships';
import { isCreatorAdmin }      from '../../lib/roles';
import { api }                 from '../../lib/api.js';

const CATEGORIES = [
  'Comedy','Music','Dance','Fitness','Gaming','Education',
  'Cooking','Motivation','Kids','Talk Show','Tutorials','Art',
];

const TYPE_FILTERS = [
  { value: '',         label: 'All' },
  { value: 'live',     label: '📡 Live' },
  { value: 'recorded', label: '🎬 Recorded' },
  { value: 'upcoming', label: '📅 Upcoming' },
  { value: 'ended',    label: '✅ Ended' },
];

const STATUS_BADGE = {
  live:      { label: '🔴 Live Now',  color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  upcoming:  { label: '📅 Upcoming',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  ended:     { label: '✅ Ended',      color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
  cancelled: { label: '🚫 Cancelled', color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
};

function getMode(event) {
  return event.event_mode || event.event_type || (event.stage_room_id ? 'live' : 'recorded');
}

/* ── Standard event card (from /api/events) ─────────────────────────── */
function EventCard({ event }) {
  const mode    = getMode(event);
  const isLive  = mode === 'live';
  const status  = event.computed_status || event.status || 'upcoming';
  const badge   = STATUS_BADGE[status] ?? STATUS_BADGE.upcoming;
  const price   = Number(event.price ?? event.ticket_price ?? 0);
  const dateStr = (event.start_time || event.starts_at)
    ? new Date(event.start_time || event.starts_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : event.date || null;

  return (
    <Link to={`/events/${event.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={cardStyle}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; }}
      >
        <div style={thumbBox(isLive)}>
          {event.thumbnail_url || event.image_url
            ? <img src={event.thumbnail_url || event.image_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            : (isLive ? '📡' : '🎬')}
          {status === 'live' && <LiveDot />}
        </div>
        <div style={{ padding: '1rem 1.125rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <Pill bg={badge.bg} color={badge.color}>{badge.label}</Pill>
            <Pill bg={isLive ? 'rgba(167,139,250,0.12)' : 'rgba(52,211,153,0.12)'} color={isLive ? '#a78bfa' : '#34d399'}>
              {isLive ? 'Live' : 'Recorded'}
            </Pill>
          </div>
          <p style={{ margin: '0 0 0.3rem', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>{event.title}</p>
          {event.description && (
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', color: 'rgba(200,200,215,0.5)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {event.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)' }}>
              {dateStr ? `📅 ${dateStr}` : (event.location ? `📍 ${event.location}` : '')}
            </span>
            <Pill bg={price === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(245,166,35,0.12)'} color={price === 0 ? '#22c55e' : '#f5a623'}>
              {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
            </Pill>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Creator-posted slot card (from /api/creator/events/public) ─────── */
function SlotCard({ slot }) {
  const isLive = slot.is_live || slot.status === 'live';
  const creator = slot.profiles;
  const displayName = creator?.display_name || creator?.username || 'Creator';

  return (
    <Link to={`/event/${slot.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={cardStyle}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; }}
      >
        <div style={thumbBox(isLive)}>
          {slot.thumbnail_url
            ? <img src={slot.thumbnail_url} alt={slot.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            : (isLive ? '📡' : '🎬')}
          {isLive && <LiveDot />}
        </div>
        <div style={{ padding: '1rem 1.125rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {slot.category && (
              <Pill bg="rgba(245,166,35,0.1)" color="#f5a623">#{slot.category}</Pill>
            )}
            <Pill bg={isLive ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)'} color={isLive ? '#f87171' : '#34d399'}>
              {isLive ? '🔴 Live' : '🎬 Video'}
            </Pill>
            <Pill bg="rgba(34,197,94,0.1)" color="#22c55e">Free</Pill>
          </div>
          <p style={{ margin: '0 0 0.3rem', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>{slot.title}</p>
          {slot.description && (
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'rgba(200,200,215,0.5)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {slot.description}
            </p>
          )}
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(200,200,215,0.35)' }}>by {displayName}</p>
        </div>
      </div>
    </Link>
  );
}

/* ── tiny shared UI helpers ─────────────────────────────────────────── */
function Pill({ children, color, bg }) {
  return (
    <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, background: bg, color, border: `1px solid ${color}44` }}>
      {children}
    </span>
  );
}

function LiveDot() {
  return (
    <span style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', background: '#f87171', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      ● Live
    </span>
  );
}

/* ── main component ─────────────────────────────────────────────────── */
export default function EventsPage() {
  const { category: routeCategory } = useParams(); // from /events/category/:category
  const { role }  = useAuth();
  const { tier }  = useMembership();

  const [events,      setEvents]      = useState([]);
  const [slots,       setSlots]       = useState([]);
  const [typeFilter,  setTypeFilter]  = useState('');
  const [catFilter,   setCatFilter]   = useState(routeCategory || '');
  const [loading,     setLoading]     = useState(true);
  const [slotsLoading,setSlotsLoading]= useState(true);
  const [error,       setError]       = useState('');

  const isAdmin     = isCreatorAdmin(role);
  const isCreator50 = tier === 'creator_50' || isAdmin;

  // Sync route category param
  useEffect(() => {
    if (routeCategory) setCatFilter(routeCategory);
  }, [routeCategory]);

  // Load standard events
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (typeFilter) params.set('type', typeFilter);
        const json = await api(`/api/events?${params}`);
        setEvents(Array.isArray(json.data) ? json.data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [typeFilter]);

  // Load creator-posted slots
  useEffect(() => {
    async function loadSlots() {
      setSlotsLoading(true);
      try {
        const url = catFilter
          ? `/api/creator/events/public?category=${encodeURIComponent(catFilter)}`
          : '/api/creator/events/public';
        const res  = await fetch(url);
        const data = await res.json();
        setSlots(Array.isArray(data) ? data : []);
      } catch (_) {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    }
    loadSlots();
  }, [catFilter]);

  const modeFilter  = typeFilter === 'live' || typeFilter === 'recorded' ? typeFilter : null;
  const liveEvents     = events.filter((e) => getMode(e) === 'live');
  const recordedEvents = events.filter((e) => getMode(e) === 'recorded');
  const grouped = modeFilter
    ? [{ label: null, list: events }]
    : typeFilter
    ? [{ label: null, list: events }]
    : [
        { label: liveEvents.length     ? '📡 Live Events'   : null, list: liveEvents },
        { label: recordedEvents.length ? '🎬 Pre‑Recorded'  : null, list: recordedEvents },
      ].filter((g) => g.list.length > 0);

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">🎟 Events</h1>
          <p className="page-subtitle">Browse live sessions and creator content across all categories.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {isCreator50 && (
            <Link to="/creator/new-event" className="btn btn--primary" style={{ textDecoration: 'none', flexShrink: 0 }}>
              + Post Event
            </Link>
          )}
          {isAdmin && (
            <Link to="/events/create" className="btn" style={{ textDecoration: 'none', flexShrink: 0 }}>
              ⚙ Create (Admin)
            </Link>
          )}
        </div>
      </div>

      {/* ── Category filters ── */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(200,200,215,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
          Browse by Category
        </p>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCatFilter('')}
            style={catPill(catFilter === '')}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(catFilter === c ? '' : c)}
              style={catPill(catFilter === c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Type filters (only when no category selected) ── */}
      {!catFilter && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`ai-grid__filter${typeFilter === f.value ? ' ai-grid__filter--active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fca5a5', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* ── Creator-posted events (event_slots with category) ── */}
      {(slotsLoading || slots.length > 0) && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="hub-section-title" style={{ marginBottom: '1rem' }}>
            {catFilter ? `🎬 ${catFilter}` : '🎬 Creator Content'}
          </h2>
          {slotsLoading ? (
            <div style={grid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: '260px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p style={{ color: 'rgba(200,200,215,0.35)', fontSize: '0.85rem' }}>
              No creator events in this category yet.{' '}
              {isCreator50 && <Link to="/creator/new-event" style={{ color: '#a78bfa' }}>Be the first to post →</Link>}
            </p>
          ) : (
            <div style={grid}>
              {slots.map((s) => <SlotCard key={s.id} slot={s} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Admin / scheduled events ── */}
      {!catFilter && (
        <>
          {loading ? (
            <div style={grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: '280px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </div>
          ) : events.length === 0 && slots.length === 0 ? (
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px', padding: '3rem 2rem' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎟</p>
              <p style={{ fontWeight: 700, marginBottom: '0.4rem' }}>No events yet</p>
              <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                {isCreator50 ? 'Post your first event to get started.' : 'Check back soon or upgrade to Creator to post events.'}
              </p>
              {isCreator50 && (
                <Link to="/creator/new-event" className="btn btn--primary" style={{ textDecoration: 'none' }}>
                  + Post Your First Event
                </Link>
              )}
            </div>
          ) : (
            grouped.map(({ label, list }) => (
              list.length === 0 ? null : (
                <div key={label || 'all'} style={{ marginBottom: '2.5rem' }}>
                  {label && <h2 className="hub-section-title" style={{ marginBottom: '1rem' }}>{label}</h2>}
                  <div style={grid}>
                    {list.map((ev) => <EventCard key={ev.id} event={ev} />)}
                  </div>
                </div>
              )
            ))
          )}
        </>
      )}
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */
const cardStyle = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px', overflow: 'hidden', height: '100%',
  transition: 'border-color 0.2s, transform 0.2s',
};

function thumbBox(isLive) {
  return {
    width: '100%', aspectRatio: '16/9', overflow: 'hidden',
    background: `linear-gradient(135deg, ${isLive ? '#16213e, #1a1a3e' : '#1a1a2e, #16213e'})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem',
    position: 'relative',
  };
}

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '1.25rem',
};

function catPill(active) {
  return {
    padding: '0.3rem 0.85rem', borderRadius: '999px',
    fontSize: '0.75rem', fontWeight: active ? 700 : 500,
    background: active ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.04)',
    border: active ? '1px solid rgba(245,166,35,0.4)' : '1px solid rgba(255,255,255,0.1)',
    color: active ? '#f5a623' : 'rgba(200,200,215,0.55)',
    cursor: 'pointer', transition: 'all 0.15s',
  };
}
