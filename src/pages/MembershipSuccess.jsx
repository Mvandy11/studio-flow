import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MembershipSuccess() {
  const [status,    setStatus]    = useState('activating');
  const [message,   setMessage]   = useState('');
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    const activate = async () => {
      try {
        // 1. Get current Supabase session after Stripe redirect
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('error');
          setMessage('No Supabase session found. Please log in again.');
          return;
        }

        // 2. Extract tier from URL
        const tier = new URLSearchParams(window.location.search).get('tier');
        if (!tier) {
          setStatus('error');
          setMessage('Missing membership tier in redirect URL.');
          return;
        }

        // 3. Call backend activation endpoint
        const API_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://studio-flow-backend.onrender.com/api';
        const res = await fetch(`${API_URL}/membership/activate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ tier }),
        });

        // 4. Handle non-JSON responses
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); }
        catch {
          setStatus('error');
          setMessage('Server returned an unexpected response.');
          console.error('HTML response:', text);
          return;
        }

        // 5. Handle backend errors
        if (!res.ok) {
          setStatus('error');
          setMessage(data.error || 'Activation failed.');
          return;
        }

        // ── FIX 1: refresh the Supabase session so onAuthStateChange fires ──
        //    This causes useMembership to re-fetch and get the updated tier
        //    from the server — the profile badge and all gates update instantly.
        await supabase.auth.refreshSession();
        // ────────────────────────────────────────────────────────────────────

        // 6. Success — start countdown redirect
        setStatus('success');
        setMessage('Your membership is now active!');

      } catch (err) {
        console.error(err);
        setStatus('error');
        setMessage('Unexpected error during activation.');
      }
    };

    activate();
  }, []);

  // ── FIX 2: auto-redirect to /membership after success so the user lands ──
  //    on a freshly-fetched membership state, not the stale success page.
  useEffect(() => {
    if (status !== 'success') return;
    if (countdown <= 0) {
      window.location.href = '/membership';
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown]);
  // ─────────────────────────────────────────────────────────────────────────

  if (status === 'activating') {
    return (
      <div className="activation-loading">
        <h2>Activating your membership...</h2>
        <p>Just a moment while we set up your access.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="activation-success">
        <h2>Membership Activated 🎉</h2>
        <p>{message}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #888)', marginTop: '0.5rem' }}>
          Redirecting to your membership page in {countdown}s…
        </p>
      </div>
    );
  }

  return (
    <div className="activation-error">
      <h2>Activation Failed</h2>
      <p>{message}</p>
      <button onClick={() => window.location.reload()}>Retry Activation</button>
      <button onClick={() => (window.location.href = '/membership')}>Return to Membership Page</button>
    </div>
  );
}

