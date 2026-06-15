import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MembershipSuccess() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'failed'
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;

    const poll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus('failed'); return; }

      const { data } = await supabase
        .from('members')
        .select('is_founding')
        .eq('email', user.email)
        .single();

      if (data?.is_founding) {
        setStatus('success');
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(poll, 2000); // retry every 2 seconds
      } else {
        setStatus('failed'); // give up after 20 seconds
      }
    };

    poll();
  }, []);

  // Auto-redirect to /membership after success
  useEffect(() => {
    if (status !== 'success') return;
    if (countdown <= 0) {
      window.location.href = '/membership';
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown]);

  if (status === 'loading') {
    return (
      <div className="activation-loading">
        <h2>Confirming your founding membership... ⏳</h2>
        <p>Just a moment while we verify your spot.</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="activation-error">
        <h2>Something went wrong</h2>
        <p>We couldn't confirm your founding membership. Please contact support.</p>
        <button onClick={() => window.location.reload()}>Retry</button>
        <button onClick={() => (window.location.href = '/membership')}>Go to Membership</button>
      </div>
    );
  }

  return (
    <div className="activation-success">
      <h2>Welcome, Founding Member! 🏅</h2>
      <p>Your $25/mo founding spot is locked in forever.</p>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #888)', marginTop: '0.5rem' }}>
        Redirecting to your membership page in {countdown}s…
      </p>
    </div>
  );
}
