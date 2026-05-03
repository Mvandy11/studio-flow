import { Link } from 'react-router-dom';

export default function Cancel() {
  return (
    <div style={{ maxWidth: '480px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>↩️</div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        Purchase Canceled
      </h1>
      <p style={{ color: 'var(--text-soft, #8b9fc5)', marginBottom: '0.5rem' }}>
        No charge was made. Your ticket was not issued.
      </p>
      <p style={{ color: 'var(--text-soft, #8b9fc5)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        You can return and try again at any time — your cart is still waiting.
      </p>

      <div style={{
        padding: '1rem 1.25rem', borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        fontSize: '0.8rem', color: 'var(--hub-muted, #8b9fc5)',
        marginBottom: '1.75rem',
      }}>
        🔒 Stripe confirmed no payment was processed.
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" className="hub-btn hub-btn--gold" style={{ textDecoration: 'none' }}>
          🎟 Back to Events &amp; Contests
        </Link>
        <Link to="/" className="hub-btn hub-btn--ghost" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>
    </div>
  );
}
