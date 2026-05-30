import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const API = import.meta.env.VITE_API_BASE_URL || '';

export default function CancelMembershipButton({ memberTier, onCancelled }) {
  const [step, setStep]     = useState('idle');   // idle | confirm | loading | done | error
  const [errMsg, setErrMsg] = useState('');

  async function handleCancel() {
    setStep('loading');
    setErrMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setErrMsg('Please log in again.'); setStep('error'); return; }

      const res = await fetch(`${API}/api/membership/cancel`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json();

      if (res.ok) {
        setStep('done');
        // ── Force immediate re-fetch of membership state ──────────────
        if (typeof onCancelled === 'function') {
          onCancelled();
        }
      } else {
        setErrMsg(body.error || 'Cancellation failed. Please contact support.');
        setStep('error');
      }
    } catch (err) {
      setErrMsg(err.message || 'Unexpected error.');
      setStep('error');
    }
  }

  // ── Done state ────────────────────────────────────────────────
  if (step === 'done') return (
    <div style={{
      padding: '1rem', borderRadius: '10px',
      background: 'rgba(134,239,172,0.07)', border: '1px solid rgba(134,239,172,0.2)',
      color: '#86efac', fontSize: '0.875rem',
    }}>
      ✅ Your membership has been cancelled. Your account has been updated to Free.
    </div>
  );

  // ── Confirm state ─────────────────────────────────────────────
  if (step === 'confirm') return (
    <div style={{
      padding: '1rem 1.25rem', borderRadius: '12px',
      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
    }}>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#fca5a5' }}>
        Cancel your membership?
      </p>
      <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'rgba(200,200,215,0.5)', lineHeight: 1.5 }}>
        You'll lose access to all creator features immediately. This cannot be undone —
        you'll need to subscribe again to regain access.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleCancel}
          style={{
            padding: '0.55rem 1.2rem', borderRadius: '8px', cursor: 'pointer',
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            color: '#f87171', fontWeight: 700, fontSize: '0.85rem',
          }}
        >
          Yes, Cancel Membership
        </button>
        <button
          onClick={() => setStep('idle')}
          style={{
            padding: '0.55rem 1.1rem', borderRadius: '8px', cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(200,200,215,0.7)', fontWeight: 600, fontSize: '0.85rem',
          }}
        >
          Keep Membership
        </button>
      </div>
    </div>
  );

  // ── Idle / error state ────────────────────────────────────────
  return (
    <div>
      {step === 'error' && (
        <p style={{ color: '#fca5a5', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          ⚠️ {errMsg}
        </p>
      )}
      <button
        onClick={() => setStep('confirm')}
        disabled={step === 'loading'}
        style={{
          padding: '0.5rem 1.1rem', borderRadius: '8px', cursor: 'pointer',
          background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
          color: 'rgba(239,68,68,0.7)', fontWeight: 600, fontSize: '0.82rem',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
          e.currentTarget.style.color = '#f87171';
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(239,68,68,0.7)';
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
        }}
      >
        {step === 'loading' ? 'Cancelling…' : 'Cancel Membership'}
      </button>
    </div>
  );
}
