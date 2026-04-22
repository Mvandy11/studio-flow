import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import CheckoutButton from '../../components/payments/CheckoutButton';

export default function PurchasePage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, thumbnail_url, ticket_price, stage_room_id')
        .eq('id', eventId)
        .single();

      if (error || !data) {
        setErrorMsg(error?.message ?? 'Event not found.');
      } else {
        setEvent(data);
      }
      setLoading(false);
    }

    fetchEvent();
  }, [eventId]);

  function handleSuccess() {
    navigate(`/events/${eventId}`, { replace: true });
  }

  if (loading || authLoading) {
    return (
      <div className="cinematic-hero" style={{ textAlign: 'center' }}>
        <div className="cinematic-spinner" aria-label="Loading event…" />
        <p className="cinematic-subtitle" style={{ marginTop: '1.25rem', color: 'var(--color-muted)' }}>
          Loading event…
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="cinematic-hero" style={{ textAlign: 'center' }}>
        <h2 className="cinematic-title">Event unavailable</h2>
        <p className="cinematic-subtitle" style={{ color: 'var(--color-muted)' }}>{errorMsg}</p>
        <button className="cinematic-button" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <button
        className="cinematic-button"
        style={{ marginBottom: '2rem', fontSize: '0.85rem' }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div className="cinematic-card" style={{ overflow: 'hidden', padding: 0 }}>
        {event.thumbnail_url && (
          <img
            src={event.thumbnail_url}
            alt={event.title}
            className="cinematic-thumbnail"
            style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }}
          />
        )}

        <div style={{ padding: '2rem' }}>
          <h1 className="cinematic-title" style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>
            {event.title}
          </h1>

          <p
            className="cinematic-subtitle"
            style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}
          >
            This ticket grants access to the Live Studio Stage.
          </p>

          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <span
              style={{
                fontSize: '3rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--color-text, #fff)',
              }}
            >
              ${Number(event.ticket_price ?? 0).toFixed(2)}
            </span>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
              one-time ticket
            </p>
          </div>

          {user ? (
            <CheckoutButton
              eventId={eventId}
              price={event.ticket_price ?? 0}
              user={user}
              onSuccess={handleSuccess}
            />
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.9rem' }}>
              Please sign in to purchase a ticket.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
