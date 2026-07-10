import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { popTicketIntent } from '../lib/stripeLinks';
import { supabase } from '../lib/supabase';

/**
 * Stripe returns here after a successful payment.
 * Reads the saved intent from localStorage, refreshes the Supabase session
 * so subscription_active is current, then shows confirmation.
 */
export default function PaymentSuccess() {
  const [status, setStatus] = useState('loading');
  const [intent, setIntent] = useState(null);

  useEffect(() => {
    async function init() {
      // Refresh Supabase session so subscription_active is up-to-date
      // after Stripe redirects back (the webhook may have already fired).
      try {
        await supabase.auth.refreshSession();
      } catch (_) {
        // Non-fatal — proceed even if refresh fails
      }

      const saved = popTicketIntent();
      if (!saved) {
        setStatus('no-intent');
        return;
      }
      setIntent(saved);
      setStatus('success');
    }

    init();
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
            Your payment was processed by Stripe. If your access doesn't appear shortly, please
            contact support.
          </p>
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
          <strong style={{ color: '#fff' }}>{intent?.eventTitle || 'Your access'}</strong>
        </p>
        <p style={muted}>
          Your payment has been confirmed and your access is active.
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
