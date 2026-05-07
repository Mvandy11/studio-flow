import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { popTicketIntent } from '../lib/stripeLinks.js';

/**
 * Stripe returns here after a successful payment (e.g., paid events).
 */
export default function Success() {
  const { user, loading } = useAuth();
  const [status,     setStatus]     = useState('checking');
  const [ticketInfo, setTicketInfo] = useState(null);

  useEffect(() => {
    if (loading) return;

    const intent = popTicketIntent();

    if (!intent || !user || intent.userId !== user.id) {
      setStatus('generic');
      return;
    }

    setTicketInfo(intent);
    setStatus('done');
  }, [user, loading]);

  if (status === 'checking' || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="cinematic-spinner" />
      </div>
    );
  }

  if (status === 'generic') {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center', padding: '0 1.5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌟</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--accent-gold, #f5a623)' }}>
          Payment Successful
        </h1>
        <p style={{ color: 'var(--text-soft)', marginBottom: '1.75rem' }}>
          Your payment has been processed. Welcome to Studio Flow!
        </p>
        <Link to="/" className="hub-btn hub-btn--gold" style={{ textDecoration: 'none' }}>
          Go to Studio Flow →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '520px', margin: '4rem auto', padding: '0 1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--hub-gold, #f5a623)', margin: '0 0 0.4rem' }}>
          Payment Successful!
        </h1>
        <p style={{ color: 'var(--text-soft)', margin: 0 }}>
          Your access has been confirmed.
        </p>
      </div>

      <div style={{
        background: 'var(--hub-card, #111d33)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
      }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245,166,35,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
          🎟
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 0.15rem', fontWeight: 700, fontSize: '0.95rem' }}>
            {ticketInfo?.eventTitle || 'Event Access'}
          </p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--hub-muted, #8b9fc5)' }}>
            Admission confirmed · ${ticketInfo?.amount}
          </p>
        </div>
      </div>

      <div style={{
        padding: '0.75rem 1rem', borderRadius: '10px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        fontSize: '0.8rem', color: 'var(--hub-muted, #8b9fc5)',
        marginBottom: '1.5rem', textAlign: 'center',
      }}>
        🔒 Payment processed securely via Stripe. A receipt was sent to your email.
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/events" className="hub-btn hub-btn--gold" style={{ textDecoration: 'none' }}>
          Back to Events
        </Link>
        <Link to="/" className="hub-btn hub-btn--ghost" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>
    </div>
  );
}
