import { useState } from 'react';
import { EVENTS } from '../data.js';
import { supabase } from '../../../lib/supabase.js';
import { useAuth } from '../../../hooks/useAuth.js';

export default function EventsTab({ isMember, onTicketPurchased }) {
  const { user } = useAuth();
  const [purchasing, setPurchasing] = useState(null);
  const [purchased, setPurchased] = useState(new Set());
  const [toast, setToast] = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleBuyTicket(event) {
    if (!user) { showToast('Log in to buy tickets.', 'error'); return; }
    if (!isMember) { showToast('A Studio Flow subscription is required to purchase tickets.', 'error'); return; }
    if (purchased.has(event.id)) return;

    setPurchasing(event.id);
    try {
      // Insert paid ticket
      const { error: e1 } = await supabase.from('hub_tickets').insert({
        user_id:     user.id,
        event_id:    event.id,
        event_title: event.title,
        ticket_type: 'paid',
        amount:      event.price,
        status:      'upcoming',
      });
      if (e1) throw e1;

      // Insert free viewing ticket (perk)
      await supabase.from('hub_tickets').insert({
        user_id:     user.id,
        event_id:    event.id,
        event_title: event.title,
        ticket_type: 'free',
        amount:      0,
        status:      'upcoming',
      });

      setPurchased((prev) => new Set([...prev, event.id]));
      showToast(`🎟 Ticket purchased! You also got 1 FREE viewing ticket for ${event.title}.`);
      onTicketPurchased?.();
    } catch (err) {
      showToast(err.message || 'Purchase failed.', 'error');
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <div className="hub-content">
      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:'80px', right:'1.5rem', zIndex:3000,
          padding:'0.875rem 1.25rem', borderRadius:'12px', maxWidth:'380px',
          background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
          border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}`,
          color: toast.type === 'error' ? '#fca5a5' : '#86efac',
          fontSize:'0.875rem', fontWeight:500, boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {toast.msg}
        </div>
      )}

      <div className="page-header" style={{ marginBottom:'1.5rem' }}>
        <h1 className="hub-section-title" style={{ fontSize:'1.6rem' }}>🎟 Events</h1>
        <p style={{ color:'var(--hub-muted)', fontSize:'0.9rem', margin:0 }}>
          Buy a ticket to any event and automatically receive 1 free viewing ticket.
        </p>
      </div>

      {/* Free ticket perk banner */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.875rem 1.125rem', borderRadius:'12px', background:'rgba(34,197,94,0.07)', border:'1px solid rgba(34,197,94,0.2)', marginBottom:'1.75rem', fontSize:'0.875rem' }}>
        <span style={{ fontSize:'1.25rem' }}>🎁</span>
        <div>
          <strong style={{ color:'#22c55e' }}>Buy 1, Get 1 Free Viewing Ticket!</strong>
          <span style={{ color:'var(--hub-muted)', marginLeft:'0.5rem' }}>
            Every ticket purchase automatically includes a free viewing ticket.
          </span>
        </div>
      </div>

      {!isMember && (
        <div className="member-gate" style={{ marginBottom:'1.5rem' }}>
          <p className="member-gate__text">A Studio Flow subscription is required to purchase tickets.</p>
        </div>
      )}

      <div className="events-grid">
        {EVENTS.map((event) => {
          const isPurchased = purchased.has(event.id);
          return (
            <div key={event.id} className="event-card-hub">
              <div className="event-card-hub__header">
                <span className="event-card-hub__emoji">{event.emoji}</span>
                <h3 className="event-card-hub__title">{event.title}</h3>
                <span className="event-card-hub__price">${event.price}</span>
              </div>

              <div className="event-card-hub__meta">
                <span>📅 {event.date}</span>
                <span>📍 {event.venue}</span>
              </div>

              <p className="event-card-hub__desc">{event.description}</p>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.5rem', flexWrap:'wrap' }}>
                <span className="event-card-hub__perk">🎁 Free viewing ticket included</span>
                {isPurchased ? (
                  <span className="hub-badge hub-badge--active">✓ Purchased</span>
                ) : (
                  <button
                    className="hub-btn hub-btn--gold"
                    onClick={() => handleBuyTicket(event)}
                    disabled={purchasing === event.id || !isMember}
                  >
                    {purchasing === event.id ? 'Processing…' : `Buy Ticket — $${event.price}`}
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
