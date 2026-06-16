import { useEffect, useState } from 'react';

export default function MembershipSuccess() {
  const [status, setStatus] = useState('loading');
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      setStatus('failed');
      return;
    }

    // Call claim-founding with the session_id
    fetch('/.netlify/functions/claim-founding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(res => res.json())
      .then(data => {
        console.log('claim-founding response:', data);
        if (data.success || data.message === 'Already a founding member') {
          setStatus('success');
        } else {
          setStatus('failed');
        }
      })
      .catch(err => {
        console.error('claim-founding error:', err);
        setStatus('failed');
      });
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

  if (status === 'loading') return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#fff' }}>
      <p>🏅 Locking in your founding spot...</p>
    </div>
  );

  if (status === 'failed') return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#fff' }}>
      <p>Something went wrong. Please contact support.</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>Retry</button>
    </div>
  );

  return (
    <div className="activation-success" style={{ textAlign: 'center', padding: '60px', color: '#fff' }}>
      <h2>Welcome, Founding Member! 🏅</h2>
      <p>Your $25/mo founding spot is locked in forever.</p>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #888)', marginTop: '0.5rem' }}>
        Redirecting to your membership page in {countdown}s…
      </p>
    </div>
  );
}
