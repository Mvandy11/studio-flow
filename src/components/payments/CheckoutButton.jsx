import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { createTicket } from '../../lib/createTicket';

/**
 * Simulated checkout button.
 * Props:
 *   eventId  {string}   - event UUID
 *   price    {number}   - ticket price (display only for now)
 *   user     {object}   - Supabase user object
 *   onSuccess {function} - called after the ticket is created
 */
export default function CheckoutButton({ eventId, price, user, onSuccess }) {
  const [state, setState] = useState('idle'); // 'idle' | 'processing' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  async function handleBuy() {
    if (!user) {
      setErrorMsg('You must be signed in to purchase a ticket.');
      setState('error');
      return;
    }

    setState('processing');
    setErrorMsg('');

    try {
      await createTicket(supabase, eventId, user.id);
      setState('idle');
      onSuccess();
    } catch (err) {
      setErrorMsg(err.message);
      setState('error');
    }
  }

  const isProcessing = state === 'processing';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      <button
        className="cinematic-button-accent"
        onClick={handleBuy}
        disabled={isProcessing}
        style={{
          fontSize: '1.05rem',
          padding: '0.85rem 2.5rem',
          opacity: isProcessing ? 0.65 : 1,
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          minWidth: '200px',
        }}
      >
        {isProcessing ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center' }}>
            <span className="cinematic-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
            Processing…
          </span>
        ) : (
          `Buy Ticket — $${Number(price).toFixed(2)}`
        )}
      </button>

      {state === 'error' && (
        <p style={{ color: 'var(--color-error, #f87171)', fontSize: '0.85rem', margin: 0 }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}
