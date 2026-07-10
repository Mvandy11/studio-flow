import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const TEST_CHECKOUT_URL = import.meta.env.VITE_STRIPE_TEST_CHECKOUT_URL;

export default function TestFounding() {
  const [user, setUser] = useState(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleClick = (e) => {
    if (!user) {
      e.preventDefault();
      setShowAuthPrompt(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ background: '#1e293b', border: '2px dashed #ffb800', borderRadius: '16px', padding: '40px', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <div style={{ background: '#ff6b35', color: '#fff', fontSize: '0.75rem', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', display: 'inline-block', marginBottom: '16px', letterSpacing: '0.1em' }}>
          🧪 TEST MODE — NO REAL CHARGES
        </div>
        <h2 style={{ color: '#ffb800', fontSize: '1.8rem', fontWeight: '800', margin: '0 0 8px 0' }}>Founding Member Test Checkout</h2>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
          Use Stripe test card <strong style={{ color: '#e2e8f0' }}>4242 4242 4242 4242</strong>, any future expiry, any CVC.
        </p>

        <a
          href={TEST_CHECKOUT_URL}
          onClick={handleClick}
          style={{ display: 'block', padding: '14px 28px', background: '#ffb800', color: '#000', fontWeight: '800', fontSize: '1rem', borderRadius: '10px', textDecoration: 'none', marginBottom: '16px' }}
        >
          Test Claim Founding Spot →
        </a>

        {showAuthPrompt && (
          <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(255,184,0,0.1)', border: '1px solid #ffb800', borderRadius: '12px' }}>
            <p style={{ color: '#ffb800', fontWeight: '600', marginBottom: '12px' }}>⚡ Create a free account before checkout</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <a href="/signup" style={{ padding: '8px 20px', background: '#ffb800', color: '#000', borderRadius: '8px', fontWeight: '700', textDecoration: 'none' }}>Create Account</a>
              <a href="/login" style={{ padding: '8px 20px', border: '1px solid #ffb800', color: '#ffb800', borderRadius: '8px', fontWeight: '700', textDecoration: 'none' }}>Sign In</a>
            </div>
          </div>
        )}

        <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '20px' }}>
          This page is not linked anywhere on the site. Access via /test-founding only.
        </p>
      </div>
    </div>
  );
}
