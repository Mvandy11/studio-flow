import { Link } from 'react-router-dom';
import { EVENTS } from '../data.js';

export default function EventsTab() {
  return (
    <div className="hub-content">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="hub-section-title" style={{ fontSize: '1.6rem' }}>🎟 Events</h1>
        <p style={{ color: 'var(--hub-muted)', fontSize: '0.9rem', margin: 0 }}>
          Upcoming events hosted on Studio Flow. View details and register on the events page.
        </p>
      </div>

      <div className="events-grid">
        {EVENTS.map((event) => {
          const isStandard = event.price <= 2;
          const tierColor  = isStandard ? 'var(--hub-blue)' : 'var(--hub-gold)';
          const tierLabel  = isStandard ? 'Standard' : 'Premium';

          return (
            <div key={event.id} className="event-card-hub">
              <div className="event-card-hub__header">
                <span className="event-card-hub__emoji">{event.emoji}</span>
                <h3 className="event-card-hub__title">{event.title}</h3>
                <span className="event-card-hub__price" style={{ color: tierColor }}>${event.price}</span>
              </div>

              <div className="event-card-hub__meta">
                <span>📅 {event.date}</span>
                <span>📍 {event.venue}</span>
              </div>

              <p className="event-card-hub__desc">{event.description}</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <span className="hub-badge" style={{
                  background: isStandard ? 'rgba(59,130,246,0.1)' : 'rgba(245,166,35,0.1)',
                  color: tierColor,
                  border: `1px solid ${isStandard ? 'rgba(59,130,246,0.3)' : 'rgba(245,166,35,0.3)'}`,
                }}>
                  {tierLabel} · ${event.price}
                </span>
                <Link
                  to="/events"
                  className="hub-btn hub-btn--gold"
                  style={{ textDecoration: 'none', fontSize: '0.82rem' }}
                >
                  View Event →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {EVENTS.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--hub-muted)' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎟</p>
          <p>No upcoming events. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
