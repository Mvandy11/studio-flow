import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { createTicket } from '../lib/createTicket';
import { popTicketIntent } from '../lib/stripeLinks';

/**
 * Stripe returns here after a successful payment.
 * Reads the saved intent from localStorage, creates the ticket, and
 * records an earnings entry for the event creator (80% share).
 */
export default function PaymentSuccess() {
  const [status,  setStatus]  = useState('loading'); // 'loading' | 'success' | 'no-intent' | 'error'
  const [intent,  setIntent]  = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function finalize() {
      const saved = popTicketIntent();
      if (!saved) {
        setStatus('no-intent');
        return;
      }

      setIntent(saved);

      try {
        // 1. Create the ticket in the database
        await createTicket(supabase, saved.eventId, saved.userId);

        // 2. Record earnings for the event/contest creator (best-effort)
        try {
          await fetch('/api/payouts/record-earning', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              eventId:    saved.category === 'event'   ? saved.eventId : null,
              contestId:  saved.category === 'contest' ? saved.eventId : null,
              amount:     saved.amount,
              ticketType: saved.ticketType,
              buyerUserId: saved.userId,
            }),
          });
        } catch {
          // non-fatal — earnings recording can be retried later
        }

        setStatus('success');
      } catch (err) {
        setErrorMsg(err.message);
        setStatus('error');
      }
    }

    finalize();
  }, []);

  const backHref = intent?.category === 'contest' ? '/contests' : '/events/' + (intent?.eventId || '');

  if (status === 'loading') {
    return (
      <div style={page}>
        <div className="cinematic-spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
        <p style={muted}>Confirming your payment…</p>
      </div>
    );
  }

  if (status === 'no-intent') {
    return (
      <div style={page}>
        <div style={card}>
          <h1 style={title}>Payment Received</h1>
          <p style={muted}>
            Your payment was processed by Stripe. If your ticket doesn't appear shortly, please
            contact support.
          </p>
          <Link to="/" style={linkStyle}>Go to Home</Link>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={page}>
        <div style={card}>
          <h1 style={{ ...title, color: '#f87171' }}>Something went wrong</h1>
          <p style={muted}>
            Your Stripe payment succeeded but we couldn't record your ticket: {errorMsg}
          </p>
          <p style={muted}>Please contact support with your receipt email.</p>
          <Link to="/" style={linkStyle}>Go to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎟</div>
        <h1 style={title}>You're in!</h1>
        <p style={{ ...muted, fontSize: '1rem', marginBottom: '0.25rem' }}>
          <strong style={{ color: '#fff' }}>{intent?.eventTitle || 'Your ticket'}</strong>
        </p>
        <p style={muted}>
          Your ticket has been confirmed and added to your account.
          {intent?.votingAllowed && ' You can now vote in this contest.'}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <Link to={backHref} style={linkStyle}>
            {intent?.category === 'contest' ? 'Back to Contests' : 'Back to Event'}
          </Link>
          <Link to="/earnings" style={{ ...linkStyle, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(200,200,215,0.7)' }}>
            View Earnings
          </Link>
        </div>
      </div>
    </div>
  );
}

const page = {
  minHeight: '60vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  gap: '1rem',
};

const card = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '18px',
  padding: '2.5rem 2rem',
  maxWidth: '480px',
  width: '100%',
  textAlign: 'center',
};

const title = {
  fontSize: '1.75rem',
  fontWeight: 700,
  color: '#fff',
  margin: '0 0 0.75rem',
};

const muted = {
  color: 'rgba(200,200,215,0.55)',
  fontSize: '0.9rem',
  margin: '0 0 0.5rem',
};

const linkStyle = {
  display: 'inline-block',
  padding: '0.65rem 1.5rem',
  borderRadius: '10px',
  background: 'var(--accent-blue, #60a5fa)',
  color: '#000',
  fontWeight: 700,
  fontSize: '0.9rem',
  textDecoration: 'none',
};
