import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api.js';

const PRESET_AMOUNTS = [5, 10, 25, 50];

/**
 * DonationButton — compact donation widget.
 * Can be dropped anywhere on the page.
 *
 * Props:
 *   compact (bool) — show only the button, no preset chips
 */
export default function DonationButton({ compact = false }) {
  const [amount,  setAmount]  = useState('');
  const [preset,  setPreset]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [open,    setOpen]    = useState(false);

  const effective = preset ?? (amount ? Number(amount) : null);

  async function handleDonate() {
    if (!effective || effective <= 0) { setError('Please enter a donation amount.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please log in to donate.'); setLoading(false); return; }

      const json = await api('/api/payments/create-donation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ amount: effective }),
      });

      if (json.url) {
        window.location.href = json.url;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={() => setOpen((o) => !o)}
        style={compactTrigger}
        title="Support creators with a donation"
      >
        💝 Donate
      </button>
    );
  }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: '1.5rem' }}>💝</span>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Support Studio Flow</p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(200,200,215,0.55)' }}>
            100% goes to the monthly Reward Pool
          </p>
        </div>
      </div>

      {/* Preset chips */}
      <div style={chips}>
        {PRESET_AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => { setPreset(a); setAmount(''); }}
            style={chip(preset === a)}
          >
            ${a}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', paddingLeft: '0.25rem' }}>$</span>
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Custom amount"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setPreset(null); }}
          style={input}
        />
      </div>

      {error && <p style={{ color: '#fca5a5', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>{error}</p>}

      <button onClick={handleDonate} disabled={loading || !effective} style={donateBtn(loading || !effective)}>
        {loading ? 'Redirecting…' : `Donate${effective ? ' $' + effective : ''}`}
      </button>
    </div>
  );
}

/* ── Styles ── */
const wrap = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  padding: '1.25rem',
  maxWidth: '340px',
  width: '100%',
};

const header = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginBottom: '1rem',
};

const chips = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
  marginBottom: '0.75rem',
};

const chip = (active) => ({
  padding: '0.35rem 0.85rem',
  borderRadius: '999px',
  border: `1px solid ${active ? 'var(--accent-gold, #f5a623)' : 'rgba(255,255,255,0.12)'}`,
  background: active ? 'rgba(245,166,35,0.15)' : 'transparent',
  color: active ? 'var(--accent-gold, #f5a623)' : 'rgba(255,255,255,0.65)',
  fontWeight: active ? 700 : 400,
  fontSize: '0.85rem',
  cursor: 'pointer',
});

const input = {
  flex: 1,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '0.45rem 0.75rem',
  fontSize: '0.875rem',
  color: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
};

const donateBtn = (disabled) => ({
  width: '100%',
  padding: '0.65rem',
  borderRadius: '10px',
  background: disabled ? 'rgba(245,166,35,0.3)' : 'var(--accent-gold, #f5a623)',
  color: '#000',
  fontWeight: 700,
  fontSize: '0.9rem',
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
});

const compactTrigger = {
  padding: '0.45rem 1rem',
  borderRadius: '8px',
  background: 'rgba(245,166,35,0.12)',
  border: '1px solid rgba(245,166,35,0.3)',
  color: 'var(--accent-gold, #f5a623)',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
};
