import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const TIER_LABELS = {
  member_30:  { label: '$30 Member',   emoji: '🌟', color: '#60a5fa' },
  creator_50: { label: '$50 Creator',  emoji: '🎬', color: '#a78bfa' },
};

/**
 * Stripe Payment Link success redirect target.
 * URL: /membership/success?tier=member_30
 *         or    /membership/success?tier=creator_50
 *
 * Reads the tier from the query string, calls /api/membership/activate,
 * then redirects to /membership.
 */
export default function MembershipSuccess() {
  const navigate   = useNavigate();
  const [status, setStatus] = useState('activating'); // activating | success | error
  const [tierKey, setTierKey] = useState(null);
  const [errMsg,  setErrMsg]  = useState('');

  useEffect(() => {
    activate();
  }, []);

  async function activate() {
    const params = new URLSearchParams(window.location.search);
    const tier   = params.get('tier');
    setTierKey(tier);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Not logged in — save intent to localStorage and redirect to login
        if (tier) localStorage.setItem('pending_membership_tier', tier);
        navigate('/login?redirect=/membership/success' + (tier ? `?tier=${tier}` : ''));
        return;
      }

      const res = await fetch('/api/membership/activate', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tier }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Activation failed.');

      setStatus('success');

      // Redirect to membership page after a short delay
      setTimeout(() => navigate('/membership'), 2500);
    } catch (err) {
      setErrMsg(err.message);
      setStatus('error');
    }
  }

  const tierMeta = TIER_LABELS[tierKey] ?? { label: 'Membership', emoji: '🌟', color: '#60a5fa' };

  return (
    <div style={page}>
      <div style={card}>
        {status === 'activating' && (
          <>
            <div className="cinematic-spinner" style={{ width: '2.5rem', height: '2.5rem', marginBottom: '1rem' }} />
            <h1 style={title}>Activating your membership…</h1>
            <p style={muted}>Just a moment while we set up your access.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{tierMeta.emoji}</div>
            <h1 style={{ ...title, color: tierMeta.color }}>Welcome to Studio Flow!</h1>
            <p style={{ ...muted, fontSize: '1rem', marginBottom: '0.25rem' }}>
              <strong style={{ color: '#fff' }}>{tierMeta.label}</strong> is now active.
            </p>
            <p style={muted}>Redirecting you to your membership page…</p>
            <Link to="/membership" style={{ ...linkBtn, background: tierMeta.color, marginTop: '1.25rem', display: 'inline-block' }}>
              Go to Membership
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
            <h1 style={title}>Activation Issue</h1>
            <p style={{ ...muted, color: '#fca5a5' }}>{errMsg}</p>
            <p style={muted}>
              Your payment was received by Stripe. Please contact support if your access doesn't
              appear after logging in.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <button onClick={activate} style={linkBtn}>Try Again</button>
              <Link to="/membership" style={{ ...linkBtn, background: 'rgba(255,255,255,0.08)', color: 'rgba(200,200,215,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
                Go to Membership
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const page = {
  minHeight: '70vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem',
};

const card = {
  background:   'rgba(255,255,255,0.04)',
  border:       '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding:      '2.5rem 2rem',
  maxWidth:     '480px',
  width:        '100%',
  textAlign:    'center',
};

const title = {
  fontSize:   '1.6rem',
  fontWeight: 800,
  color:      '#fff',
  margin:     '0 0 0.5rem',
};

const muted = {
  color:    'rgba(200,200,215,0.55)',
  fontSize: '0.9rem',
  margin:   '0 0 0.5rem',
};

const linkBtn = {
  display:       'inline-block',
  padding:       '0.65rem 1.5rem',
  borderRadius:  '10px',
  background:    '#60a5fa',
  color:         '#000',
  fontWeight:    700,
  fontSize:      '0.9rem',
  textDecoration: 'none',
  border:        'none',
  cursor:        'pointer',
};
