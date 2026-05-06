import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { buildStripeUrl } from '../../lib/stripeLinks';
import { useAuth } from '../../hooks/useAuth';
import { isCreatorAdmin } from '../../lib/roles';

export default function EventsPage() {
  const { role } = useAuth();
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const { data, error: err } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });

        if (err) throw err;
        setEvents(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">🎟 Live Events</h1>
          <p className="page-subtitle">Discover and attend upcoming creator events.</p>
        </div>
        {isCreatorAdmin(role) && (
          <Link to="/events/create" className="btn btn--primary" style={{ textDecoration: 'none' }}>
            + Create Event
          </Link>
        )}
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="contests-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ai-card ai-card--skeleton" style={{ height: '220px', borderRadius: '16px' }} />
          ))}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted, #9ca3af)' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎟</p>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>No events yet.</p>
          <p style={{ fontSize: '0.9rem' }}>Be the first to create one!</p>
          {isCreatorAdmin(role) && (
            <Link to="/events/create" className="btn btn--primary" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '1rem' }}>
              Create Event
            </Link>
          )}
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="contests-grid">
          {events.map((event) => {
            const isStandard = Number(event.price) <= 2;
            const tierColor  = isStandard ? 'var(--accent-blue, #3b82f6)' : 'var(--accent-gold, #f2c98f)';
            const tierLabel  = isStandard ? 'Standard' : 'Premium';

            return (
              <div
                key={event.id}
                className="contest-card"
                style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', cursor: 'default' }}
              >
                {event.thumbnail_url ? (
                  <img
                    src={event.thumbnail_url}
                    alt={event.title}
                    className="contest-card__thumb"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="contest-card__thumb"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}
                  >
                    🎬
                  </div>
                )}

                <div className="contest-card__body" style={{ flex: 1 }}>
                  <h3 className="contest-card__title">{event.title}</h3>

                  {(event.date || event.event_date) && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #9ca3af)', margin: '0.25rem 0 0' }}>
                      📅 {event.date || event.event_date}
                    </p>
                  )}
                  {(event.location || event.venue) && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #9ca3af)', margin: '0.2rem 0 0' }}>
                      📍 {event.location || event.venue}
                    </p>
                  )}
                  {event.description && (
                    <p className="contest-card__desc" style={{ marginTop: '0.5rem' }}>{event.description}</p>
                  )}

                  <div className="contest-card__meta" style={{ marginTop: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                      padding: '0.15rem 0.5rem', borderRadius: '999px',
                      background: `${tierColor}18`, color: tierColor, border: `1px solid ${tierColor}40`,
                    }}>
                      {tierLabel}
                    </span>
                  </div>
                </div>

                <div className="contest-card__footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: tierColor }}>
                    ${Number(event.price || 0).toFixed(0)}
                  </span>
                  <a
                    href={buildStripeUrl(event.price, 'event')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--primary"
                    style={{ textDecoration: 'none', fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}
                  >
                    Buy Ticket
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
