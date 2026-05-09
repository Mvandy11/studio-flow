import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import API_BASE from '../lib/apiBase.js';

/**
 * Public view page for a custom event slot.
 * Shows title, description, price, and a "Purchase Access" button.
 */
export default function EventSlotView() {
  const { slotId } = useParams();
  const [slot,    setSlot]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying,  setBuying]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('event_slots')
        .select('id, title, description, price, event_type, user_id')
        .eq('id', slotId)
        .maybeSingle();

      if (err || !data) {
        setError('Event not found.');
      } else {
        setSlot(data);
      }
      setLoading(false);
    }
    load();
  }, [slotId]);

  async function handlePurchase() {
    setBuying(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please log in to purchase access.'); setBuying(false); return; }

      const res  = await fetch(`${API_BASE}/api/payments/create-event-payment`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ event_slot_id: slotId, amount: slot.price }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not start payment.');

      if (json.url && !json.url.startsWith('REPLACE_')) {
        window.location.href = json.url;
      } else {
        setError('Payment link not yet configured. Contact Studio Flow administration.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBuying(false);
    }
  }

  if (loading) return (
    <div style={page}>
      <div className="cinematic-spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
    </div>
  );

  if (error && !slot) return (
    <div style={page}>
      <div style={card}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
        <p style={{ color: '#fca5a5', fontSize: '0.95rem' }}>{error}</p>
      </div>
    </div>
  );

  const isOpen   = slot?.event_type === 'open';
  const price    = Number(slot?.price ?? 0);

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎬</div>
        <h1 style={title}>{slot.title}</h1>

        {slot.description && (
          <p style={desc}>{slot.description}</p>
        )}

        {/* Type badge */}
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={badge(isOpen)}>
            {isOpen ? '🔓 Open Event with Donation' : '🔒 Locked / Ticketed Event'}
          </span>
        </div>

        {/* Price */}
        {!isOpen && (
          <div style={priceBox}>
            <span style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.85rem' }}>Access Price</span>
            <span style={{ fontWeight: 800, fontSize: '1.75rem', color: 'var(--accent-gold, #f5a623)' }}>
              ${price.toFixed(2)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.4)' }}>
              98% goes directly to the creator
            </span>
          </div>
        )}

        {error && <div style={errorBox}>{error}</div>}

        {isOpen ? (
          <p style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            This is a free event. A donation option may be available below.
          </p>
        ) : (
          <button onClick={handlePurchase} disabled={buying} style={buyBtn(buying)}>
            {buying ? 'Redirecting…' : `Purchase Access — $${price.toFixed(2)}`}
          </button>
        )}

        <p style={{ marginTop: '0.875rem', fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)', textAlign: 'center' }}>
          Studio Flow uses a subscription, donation, and custom event payment system. Payment processed securely via Stripe.
        </p>
      </div>
    </div>
  );
}

/* ── Styles ── */
const page = {
  minHeight: '70vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem',
};

const card = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '2.5rem 2rem',
  maxWidth: '480px',
  width: '100%',
  textAlign: 'center',
};

const title = {
  fontSize: '1.5rem',
  fontWeight: 800,
  color: '#fff',
  margin: '0 0 0.75rem',
};

const desc = {
  color: 'rgba(200,200,215,0.65)',
  fontSize: '0.9rem',
  margin: '0 0 1.25rem',
  lineHeight: 1.6,
};

const badge = (isOpen) => ({
  display: 'inline-block',
  padding: '0.3rem 0.85rem',
  borderRadius: '999px',
  fontSize: '0.78rem',
  fontWeight: 600,
  background: isOpen ? 'rgba(34,197,94,0.1)' : 'rgba(245,166,35,0.1)',
  color: isOpen ? '#22c55e' : 'var(--accent-gold, #f5a623)',
  border: `1px solid ${isOpen ? 'rgba(34,197,94,0.3)' : 'rgba(245,166,35,0.3)'}`,
});

const priceBox = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.25rem',
  marginBottom: '1.5rem',
  padding: '1rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '12px',
};

const errorBox = {
  background: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.3)',
  borderRadius: '8px',
  padding: '0.6rem 0.875rem',
  color: '#fca5a5',
  fontSize: '0.875rem',
  marginBottom: '1rem',
  textAlign: 'left',
};

const buyBtn = (disabled) => ({
  width: '100%',
  padding: '0.85rem',
  borderRadius: '12px',
  background: disabled ? 'rgba(245,166,35,0.4)' : 'var(--accent-gold, #f5a623)',
  color: '#000',
  fontWeight: 800,
  fontSize: '1rem',
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
});
