import { useState } from 'react';
import { supabase } from '../lib/supabase';
import API_BASE from '../lib/apiBase.js';

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubscribe() {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in to subscribe.');
        setLoading(false);
        return;
      }

      const res  = await fetch(`${API_BASE}/api/payments/create-subscription`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not create subscription session.');

      if (json.url) {
        window.location.href = json.url;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={page}>
      <div style={card}>
        {/* Header */}
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌟</div>
        <h1 style={title}>Become a Studio Flow Member</h1>
        <p style={subtitle}>
          Support the creator community and unlock your place in the Studio Flow ecosystem.
        </p>

        {/* Plan card */}
        <div style={planBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Studio Flow Membership</span>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent-gold, #f5a623)' }}>$30/month</span>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              '🏆 Enter monthly contests — free, always',
              '❤️ Like and support creator submissions',
              '📢 Early access to announcements',
              '🎁 $10 from your subscription funds the monthly Reward Pool',
              '🎬 Access creator events and education sessions',
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)' }}>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Reward pool callout */}
        <div style={poolNote}>
          <strong style={{ color: 'var(--accent-gold, #f5a623)' }}>💰 $10 of every membership</strong> goes directly into the monthly Reward Pool, distributed to contest winners.
        </div>

        {error && <div style={errorBox}>{error}</div>}

        <button onClick={handleSubscribe} disabled={loading} style={btn(loading)}>
          {loading ? 'Redirecting…' : 'Subscribe Now — $30/month'}
        </button>

        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(200,200,215,0.4)', textAlign: 'center' }}>
          Studio Flow uses a subscription, donation, and custom event payment system.
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
  borderRadius: '22px',
  padding: '2.5rem 2rem',
  maxWidth: '520px',
  width: '100%',
  textAlign: 'center',
};

const title = {
  fontSize: '1.6rem',
  fontWeight: 800,
  color: '#fff',
  margin: '0 0 0.5rem',
};

const subtitle = {
  color: 'rgba(200,200,215,0.6)',
  fontSize: '0.95rem',
  margin: '0 0 1.75rem',
};

const planBox = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '14px',
  padding: '1.25rem',
  marginBottom: '1.25rem',
  textAlign: 'left',
};

const poolNote = {
  background: 'rgba(245,166,35,0.08)',
  border: '1px solid rgba(245,166,35,0.2)',
  borderRadius: '10px',
  padding: '0.75rem 1rem',
  fontSize: '0.85rem',
  color: 'rgba(255,255,255,0.7)',
  marginBottom: '1.5rem',
  textAlign: 'left',
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

const btn = (disabled) => ({
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
