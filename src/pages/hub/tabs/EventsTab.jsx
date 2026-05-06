import { useState, useEffect } from 'react';
import { EVENTS } from '../data.js';
import { supabase } from '../../../lib/supabase.js';
import { useAuth } from '../../../hooks/useAuth.js';
import { buildStripeUrl, saveTicketIntent, EVENT_LINKS } from '../../../lib/stripeLinks.js';

export default function EventsTab({ isMember }) {
  const { user } = useAuth();
  const [purchased, setPurchased] = useState(new Set());
  const [toast, setToast] = useState(null);

  // Load already-purchased event IDs for this user
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('hub_tickets')
          .select('event_id')
          .eq('user_id', user.id)
          .eq('ticket_type', 'paid');
        if (data) setPurchased(new Set(data.map((t) => t.event_id)));
      } catch (_) {}
    })();
  }, [user]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }

  function handleBuyTicket(event) {
    if (!user) {
      showToast('Log in to purchase tickets.', 'error');
      return;
    }
    if (!isMember) {
      showToast('A Studio Flow membership is required to purchase tickets.', 'error');
      return;
    }

    // Save intent to localStorage — Success page completes the ticket record
    saveTicketIntent({
      userId:      user.id,
      eventId:     event.id,
      eventTitle:  event.title,
      ticketType:  'paid',           // paid = view + attend
      amount:      event.price,      // 2 or 5
      category:    'event',
    });

    // Build compact reference for Stripe audit: "ev_{eventId}_{shortUserId}"
    const ref = `ev_${event.id}_${user.id.slice(0, 8)}`;

    // Redirect to the correct Stripe payment link
    const stripeUrl = buildStripeUrl(event.price, {
      type:              'event',
      email:             user.email,
      clientReferenceId: ref,
    });
    window.location.href = stripeUrl;
  }

  return (
    <div className="hub-content">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '1.5rem', zIndex: 3000,
          padding: '0.875rem 1.25rem', borderRadius: '12px', maxWidth: '380px',
          background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
          border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}`,
          color: toast.type === 'error' ? '#fca5a5' : '#86efac',
          fontSize: '0.875rem', fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="hub-section-title" style={{ fontSize: '1.6rem' }}>🎟 Events</h1>
        <p style={{ color: 'var(--hub-muted)', fontSize: '0.9rem', margin: 0 }}>
          Every paid ticket automatically includes 1 free view-only companion ticket.
        </p>
      </div>

      {/* Stripe links legend */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { price: 2, label: 'Standard Admission', color: 'var(--hub-blue)', link: EVENT_LINKS[2] },
          { price: 5, label: 'Premium Admission',  color: 'var(--hub-gold)', link: EVENT_LINKS[5] },
        ].map(({ price, label, color }) => (
          <div key={price} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.875rem', borderRadius: '8px',
            background: 'var(--hub-card)', border: '1px solid var(--hub-border)',
            fontSize: '0.8rem',
          }}>
            <span style={{ fontWeight: 800, color }}>${price}</span>
            <span style={{ color: 'var(--hub-muted)' }}>{label} · Secure Stripe Checkout</span>
          </div>
        ))}
      </div>

      {/* Perk banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.875rem 1.125rem', borderRadius: '12px',
        background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)',
        marginBottom: '1.75rem', fontSize: '0.875rem',
      }}>
        <span style={{ fontSize: '1.25rem' }}>🎁</span>
        <div>
          <strong style={{ color: '#22c55e' }}>Buy 1, Get 1 Free Viewing Ticket!</strong>
          <span style={{ color: 'var(--hub-muted)', marginLeft: '0.5rem' }}>
            Every purchase issues 1 paid (view + attend) + 1 free (view-only) ticket.
          </span>
        </div>
      </div>

      {!isMember && (
        <div className="member-gate" style={{ marginBottom: '1.5rem' }}>
          <p className="member-gate__text">A Studio Flow membership is required to purchase tickets.</p>
          <a
            className="hub-btn hub-btn--gold"
            href="https://buy.stripe.com/6oU8wRehfa8g0ssbh3b7y0f"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration:'none', display:'inline-block', marginTop:'0.75rem' }}
          >
            Start Free Trial — $75/year
          </a>
          <p style={{ fontSize:'0.72rem', color:'var(--hub-muted)', marginTop:'0.5rem' }}>
            30-day free trial · $75/year after · No refunds.
          </p>
        </div>
      )}

      <div className="events-grid">
        {EVENTS.map((event) => {
          const isPurchased = purchased.has(event.id);
          const isStandard  = event.price === 2;
          const tierLabel   = isStandard ? 'Standard' : 'Premium';
          const tierColor   = isStandard ? 'var(--hub-blue)' : 'var(--hub-gold)';

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
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="hub-badge" style={{
                    background: isStandard ? 'rgba(59,130,246,0.1)' : 'rgba(245,166,35,0.1)',
                    color: tierColor,
                    border: `1px solid ${isStandard ? 'rgba(59,130,246,0.3)' : 'rgba(245,166,35,0.3)'}`,
                  }}>
                    {tierLabel} · ${event.price}
                  </span>
                  <span className="event-card-hub__perk">🎁 +1 free view ticket</span>
                </div>

                {isPurchased ? (
                  <span className="hub-badge hub-badge--active">✓ Ticket Purchased</span>
                ) : (
                  <button
                    className="hub-btn hub-btn--gold"
                    onClick={() => handleBuyTicket(event)}
                    disabled={!isMember}
                    title={`Secure checkout via Stripe — $${event.price}`}
                  >
                    Buy via Stripe — ${event.price}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
