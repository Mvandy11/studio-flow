import { useState } from 'react';
import { buildStripeUrl, saveTicketIntent } from '../../lib/stripeLinks';

/**
 * Redirects to a real Stripe Payment Link.
 * On return, /payment/success finalizes the ticket via createTicket().
 *
 * Props:
 *   eventId      {string}   - event UUID or contest ID
 *   eventTitle   {string}   - human-readable event name
 *   price        {number}   - 2 or 5
 *   ticketType   {string}   - 'paid' | 'contest'
 *   category     {string}   - 'event' | 'contest'
 *   votingAllowed {boolean} - whether ticket grants voting rights
 *   user         {object}   - Supabase user object
 */
export default function CheckoutButton({
  eventId,
  eventTitle = '',
  price,
  ticketType = 'paid',
  category = 'event',
  votingAllowed = false,
  user,
}) {
  const [state,    setState]    = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handleBuy() {
    if (!user) {
      setErrorMsg('You must be signed in to purchase a ticket.');
      setState('error');
      return;
    }

    setState('processing');
    setErrorMsg('');

    saveTicketIntent({
      userId:       user.id,
      eventId,
      eventTitle,
      ticketType,
      amount:       price,
      category,
      votingAllowed,
    });

    const stripeUrl = buildStripeUrl(price, {
      email:             user.email,
      clientReferenceId: eventId,
    });

    window.location.href = stripeUrl;
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
          padding:  '0.85rem 2.5rem',
          opacity:  isProcessing ? 0.65 : 1,
          cursor:   isProcessing ? 'not-allowed' : 'pointer',
          minWidth: '200px',
        }}
      >
        {isProcessing ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center' }}>
            <span className="cinematic-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
            Redirecting to Stripe…
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
