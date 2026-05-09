import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isCreatorAdmin } from '../../lib/roles';

function EventCard({ event }) {
  const date = event.starts_at
    ? new Date(event.starts_at).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      })
    : event.date || 'TBA';

  const price = Number(event.price ?? event.ticket_price ?? 0);

  return (
    <Link
      to={`/events/${event.id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.2s',
        cursor: 'pointer',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; }}
      >
        {event.thumbnail_url || event.image_url ? (
          <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#111' }}>
            <img
              src={event.thumbnail_url || event.image_url}
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div style={{ width: '100%', aspectRatio: '16/9', background: 'linear-gradient(135deg,#1a1a2e,#16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
            🎟
          </div>
        )}

        <div style={{ padding: '1rem 1.25rem' }}>
          <p style={{ margin: '0 0 0.35rem', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>
            {event.title}
          </p>
          {event.description && (
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: 'rgba(200,200,215,0.55)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {event.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.4)' }}>📅 {date}</span>
            <span style={{
              padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
              background: price === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(245,166,35,0.12)',
              color: price === 0 ? '#22c55e' : 'var(--accent-gold, #f5a623)',
              border: `1px solid ${price === 0 ? 'rgba(34,197,94,0.3)' : 'rgba(245,166,35,0.3)'}`,
            }}>
              {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
            </span>
          </div>
          {event.location && (
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'rgba(200,200,215,0.3)' }}>
              📍 {event.location}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function EventsPage() {
  const { role } = useAuth();
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res  = await fetch('/api/events');
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
  }, []);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">🎟 Events</h1>
          <p className="page-subtitle">Browse upcoming creator events, workshops, and live sessions.</p>
        </div>
        {isCreatorAdmin(role) && (
          <Link to="/events/create" className="btn btn--primary" style={{ textDecoration: 'none', flexShrink: 0 }}>
            + Create Event
          </Link>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fca5a5', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '280px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : events.length === 0 && !error ? (
        <div style={{ textAlign: 'center', paddingTop: '3rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px', padding: '3rem 2rem' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {events.map((ev) => <EventCard key={ev.id} event={ev} />)}
        </div>
      )}
    </div>
  );
}
