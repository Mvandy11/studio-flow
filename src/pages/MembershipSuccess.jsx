import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const TIER_CONFIG = {
  member_30: {
    label:       'Member ($30/mo)',
    emoji:       '🌟',
    color:       '#60a5fa',
    redirectTo:  '/events',
    benefits: [
      'Full event access',
      'Live chat',
      'Community features',
      'Contest entry',
      'Contest reward eligibility',
    ],
  },
  creator_50: {
    label:       'Creator ($50/mo)',
    emoji:       '🎬',
    color:       '#a78bfa',
    redirectTo:  '/earnings',
    benefits: [
      'Everything in Member tier',
      'Create unlimited events',
      'Upload videos / Go live',
      'Receive donations',
      'Revenue pool participation',
      'Creator dashboard + analytics',
      'Contest entry + rewards',
    ],
  },
};

export default function MembershipSuccess() {
  const navigate  = useNavigate();
  const [status,  setStatus]  = useState('activating'); // activating | success | error
  const [tierKey, setTierKey] = useState(null);
  const [errMsg,  setErrMsg]  = useState('');
  const activatedRef = useRef(false);

  useEffect(() => {
    if (!activatedRef.current) {
      activatedRef.current = true;
      activate();
    }
  }, []);

  async function activate() {
    setStatus('activating');
    setErrMsg('');

    const params = new URLSearchParams(window.location.search);
    const tier   = params.get('tier');
    setTierKey(tier);

    if (!tier || !TIER_CONFIG[tier]) {
      setErrMsg('No valid membership tier found in the URL. Please use the membership page to upgrade.');
      setStatus('error');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        localStorage.setItem('pending_membership_tier', tier);
        navigate('/login?redirect=' + encodeURIComponent('/membership/success?tier=' + tier));
        return;
      }

      const res = await fetch('/api/membership/activate', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tier }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Activation failed.');

      setStatus('success');
      setTimeout(() => navigate(TIER_CONFIG[tier].redirectTo), 1500);
    } catch (err) {
      setErrMsg(err.message);
      setStatus('error');
    }
  }

  const cfg = TIER_CONFIG[tierKey] ?? null;

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* ── ACTIVATING ── */}
        {status === 'activating' && (
          <div style={{ textAlign: 'center' }}>
            <div className="cinematic-spinner" style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto 1.25rem' }} />
            <h1 style={styles.title}>Activating your membership…</h1>
            <p style={styles.muted}>Just a moment while we set up your access.</p>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {status === 'success' && cfg && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
            <h1 style={{ ...styles.title, color: cfg.color }}>Membership Activated!</h1>
            <p style={{ color: '#fff', fontSize: '1rem', margin: '0 0 0.35rem', fontWeight: 600 }}>
              Welcome to Studio Flow! Your membership is now active.
            </p>
            <p style={{ ...styles.muted, marginBottom: '1.5rem' }}>
              Your account has been upgraded to: <strong style={{ color: cfg.color }}>{cfg.label}</strong>
            </p>

            {/* Benefits */}
            <div style={styles.benefitsBox}>
              <p style={{ ...styles.muted, fontWeight: 700, color: 'rgba(200,200,215,0.75)', marginBottom: '0.65rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                What's unlocked
              </p>
              <ul style={styles.benefitsList}>
                {cfg.benefits.map((b) => (
                  <li key={b} style={styles.benefitItem}>
                    <span style={{ color: cfg.color, fontSize: '0.85rem' }}>✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p style={{ ...styles.muted, marginTop: '1.25rem', fontSize: '0.82rem' }}>
              Redirecting you to your dashboard…
            </p>
            <Link
              to={cfg.redirectTo}
              style={{ ...styles.btn, background: cfg.color, marginTop: '0.75rem' }}
            >
              Go to Dashboard →
            </Link>
          </div>
        )}

        {/* ── ERROR ── */}
        {status === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>❌</div>
            <h1 style={styles.title}>Something went wrong activating your membership.</h1>
            {errMsg && (
              <p style={{ ...styles.muted, color: '#fca5a5', marginBottom: '0.5rem' }}>{errMsg}</p>
            )}
            <p style={{ ...styles.muted, marginBottom: '1.5rem' }}>
              Your payment was received. Please try activating again or contact support if the issue persists.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => { activatedRef.current = false; activate(); }}
                style={styles.btn}
              >
                Retry Activation
              </button>
              <Link
                to="/membership"
                style={{ ...styles.btn, background: 'rgba(255,255,255,0.07)', color: 'rgba(200,200,215,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                Return to Membership Page
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight:      '70vh',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '2rem 1rem',
  },
  card: {
    background:   'rgba(255,255,255,0.04)',
    border:       '1px solid rgba(255,255,255,0.09)',
    borderRadius: '22px',
    padding:      '2.75rem 2rem',
    maxWidth:     '500px',
    width:        '100%',
  },
  title: {
    fontSize:   '1.5rem',
    fontWeight: 800,
    color:      '#fff',
    margin:     '0 0 0.5rem',
    lineHeight: 1.3,
  },
  muted: {
    color:    'rgba(200,200,215,0.55)',
    fontSize: '0.9rem',
    margin:   '0 0 0.4rem',
  },
  benefitsBox: {
    background:   'rgba(255,255,255,0.035)',
    border:       '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px',
    padding:      '1rem 1.25rem',
    textAlign:    'left',
  },
  benefitsList: {
    listStyle: 'none',
    padding:   0,
    margin:    0,
    display:   'flex',
    flexDirection: 'column',
    gap:       '0.45rem',
  },
  benefitItem: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.6rem',
    color:      'rgba(220,220,235,0.85)',
    fontSize:   '0.88rem',
  },
  btn: {
    display:        'inline-block',
    padding:        '0.65rem 1.5rem',
    borderRadius:   '10px',
    background:     '#60a5fa',
    color:          '#000',
    fontWeight:     700,
    fontSize:       '0.9rem',
    textDecoration: 'none',
    border:         'none',
    cursor:         'pointer',
  },
};
