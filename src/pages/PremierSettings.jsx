import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

const BASE = import.meta.env.VITE_API_BASE_URL || '';

const METHOD_OPTIONS = [
  {
    value: 'paypal', label: 'PayPal', icon: '💙',
    placeholder: 'your@email.com',
    hint: 'Enter the email address linked to your PayPal account.',
    validate: (v) => v.includes('@') || 'Enter a valid PayPal email.',
  },
  {
    value: 'venmo', label: 'Venmo', icon: '💸',
    placeholder: '@YourVenmoHandle or phone number',
    hint: 'Enter your Venmo @handle or registered phone number.',
    validate: (v) => (v.startsWith('@') || /^\+?\d{10,}$/.test(v)) || 'Enter a Venmo @handle or phone number.',
  },
  {
    value: 'stripe', label: 'Stripe Connect', icon: '🔵',
    placeholder: null, // handled by onboarding flow, not manual input
    hint: null,
    validate: () => true, // validation handled by connect status check
  },
  {
    value: 'cashapp', label: 'CashApp', icon: '💚',
    placeholder: '$YourCashtag',
    hint: 'Enter your CashApp $cashtag.',
    validate: (v) => v.startsWith('$') || 'Enter a valid CashApp $cashtag.',
  },
];

export default function PremierSettings() {
  const { user } = useAuth();

  // ── General state ──────────────────────────────────────────
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [valErr, setValErr]       = useState('');

  // ── Payout method fields ───────────────────────────────────
  const [method, setMethod]       = useState('paypal');
  const [account, setAccount]     = useState('');
  const [paypal, setPaypal]       = useState('');
  const [venmo, setVenmo]         = useState('');
  const [cashapp, setCashapp]     = useState('');

  // ── Stripe Connect state ───────────────────────────────────
  const [connectStatus, setConnectStatus] = useState({ connected: false, onboarded: false, accountId: null });
  const [connecting, setConnecting]       = useState(false);
  const [connectErr, setConnectErr]       = useState('');

  // ── Load saved settings on mount ──────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    async function load() {
      const { data } = await supabase
        .from('creator_settings')
        .select('payout_method, paypal, venmo, cashapp, stripe_connect_id, stripe_connect_onboarded')
        .eq('creator_id', user.id)
        .maybeSingle();

      if (data) {
        const m = ['paypal', 'venmo', 'stripe', 'cashapp'].includes(data.payout_method)
          ? data.payout_method : 'paypal';
        setMethod(m);
        setPaypal(data.paypal   || '');
        setVenmo(data.venmo     || '');
        setCashapp(data.cashapp || '');
        const fieldMap = { paypal: data.paypal, venmo: data.venmo, cashapp: data.cashapp, stripe: '' };
        setAccount(fieldMap[m] || '');

        // Restore connect status from DB
        setConnectStatus({
          connected:  !!data.stripe_connect_id,
          onboarded:  data.stripe_connect_onboarded ?? false,
          accountId:  data.stripe_connect_id ?? null,
        });
      }
      setLoading(false);
    }
    load();
  }, [user]);

  // ── Re-check Stripe Connect status when user switches to Stripe tab ──
  useEffect(() => {
    if (!user || method !== 'stripe') return;
    async function checkConnect() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${BASE}/api/stripe-connect/status`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const body = await res.json();
          setConnectStatus(body);
        }
      } catch (_) {
        // non-blocking — cached DB value still shows
      }
    }
    checkConnect();
  }, [user, method]);

  // ── Handle method tab switch ───────────────────────────────
  function handleMethodChange(m) {
    setMethod(m);
    setValErr('');
    setConnectErr('');
    setSaved(false);
    if (m !== 'stripe') {
      const current = { paypal, venmo, cashapp };
      setAccount(current[m] || '');
    }
  }

  // ── Start Stripe Express onboarding ───────────────────────
  async function startStripeConnect() {
    setConnecting(true);
    setConnectErr('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setConnectErr('Please log in again.'); setConnecting(false); return; }

      const res = await fetch(`${BASE}/api/stripe-connect/onboard`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json();

      if (body.url) {
        // Save stripe as selected method before redirecting
        await supabase
          .from('creator_settings')
          .upsert({ creator_id: user.id, payout_method: 'stripe' }, { onConflict: 'creator_id' });
        window.location.href = body.url;
      } else {
        setConnectErr(body.error || 'Failed to start Stripe Connect.');
        setConnecting(false);
      }
    } catch (err) {
      setConnectErr(err.message || 'Unexpected error.');
      setConnecting(false);
    }
  }

  // ── Save non-Stripe payout settings ───────────────────────
  async function saveSettings() {
    // For Stripe, saving is handled via the connect flow — just set method
    if (method === 'stripe') {
      if (!connectStatus.onboarded) {
        setValErr('Please complete Stripe Connect onboarding before saving.');
        return;
      }
      setSaving(true);
      const { error } = await supabase
        .from('creator_settings')
        .upsert({ creator_id: user.id, payout_method: 'stripe' }, { onConflict: 'creator_id' });
      setSaving(false);
      if (error) setValErr(`Save failed: ${error.message}`);
      else setSaved(true);
      return;
    }

    const opt = METHOD_OPTIONS.find((o) => o.value === method);
    if (!account.trim()) { setValErr('Account info is required.'); return; }
    const validationResult = opt?.validate(account.trim());
    if (typeof validationResult === 'string') { setValErr(validationResult); return; }

    setValErr('');
    setSaving(true);
    setSaved(false);

    // Mirror into named state so switching tabs preserves values
    if (method === 'paypal')  setPaypal(account.trim());
    if (method === 'venmo')   setVenmo(account.trim());
    if (method === 'cashapp') setCashapp(account.trim());

    const payload = {
      creator_id:    user.id,
      payout_method: method,
      paypal:   method === 'paypal'   ? account.trim() : paypal,
      venmo:    method === 'venmo'    ? account.trim() : venmo,
      cashapp:  method === 'cashapp' ? account.trim() : cashapp,
    };

    const { error } = await supabase
      .from('creator_settings')
      .upsert(payload, { onConflict: 'creator_id' });

    setSaving(false);
    if (error) setValErr(`Save failed: ${error.message}`);
    else setSaved(true);
  }

  // ── Guards ─────────────────────────────────────────────────
  if (loading) return <div className="cinematic-title">Loading…</div>;
  if (!user) return (
    <div className="cinematic-card-xl" style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'rgba(200,200,215,0.55)', marginBottom: '1rem' }}>
        Please log in to manage your payout settings.
      </p>
    </div>
  );

  const selectedOpt = METHOD_OPTIONS.find((o) => o.value === method);
  const isStripe    = method === 'stripe';

  return (
    <div className="cinematic-card-xl" style={{ padding: '2rem', maxWidth: '560px' }}>
      <h1 className="cinematic-title">Payout Settings</h1>
      <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Choose how you want to receive your earnings from Studio Flow.
      </p>

      {/* ── Method selector tabs ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {METHOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleMethodChange(opt.value)}
            style={{
              padding: '0.6rem 1.1rem', borderRadius: '10px',
              border:     method === opt.value ? '1px solid rgba(245,166,35,0.55)' : '1px solid rgba(255,255,255,0.1)',
              background: method === opt.value ? 'rgba(245,166,35,0.09)' : 'rgba(255,255,255,0.03)',
              color:      method === opt.value ? '#f5a623' : 'rgba(200,200,215,0.65)',
              fontWeight: method === opt.value ? 700 : 500,
              fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            <span>{opt.icon}</span>{opt.label}
          </button>
        ))}
      </div>

      {/* ── Stripe Connect panel (replaces text input for Stripe) ── */}
      {isStripe ? (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.25rem',
          borderRadius: '12px',
          border: connectStatus.onboarded
            ? '1px solid rgba(52,211,153,0.35)'
            : '1px solid rgba(96,165,250,0.3)',
          background: connectStatus.onboarded
            ? 'rgba(52,211,153,0.05)'
            : 'rgba(96,165,250,0.05)',
        }}>
          {connectStatus.onboarded ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>✅</span>
                <span style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '0.9rem' }}>
                  Stripe Connect Active
                </span>
              </div>
              <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.78rem', margin: 0 }}>
                Account ID: <span style={{ fontFamily: 'monospace', color: 'rgba(200,200,215,0.6)' }}>
                  {connectStatus.accountId}
                </span>
              </p>
              <p style={{ color: 'rgba(200,200,215,0.35)', fontSize: '0.75rem', marginTop: '0.4rem', marginBottom: 0 }}>
                Studio Flow will send your payouts directly to your Stripe account automatically.
              </p>
            </>
          ) : (
            <>
              <p style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.82rem', marginBottom: '1rem', marginTop: 0 }}>
                Connect your Stripe account so Studio Flow can send payouts directly to you — no manual steps needed.
              </p>
              <button
                type="button"
                onClick={startStripeConnect}
                disabled={connecting}
                style={{
                  padding: '0.65rem 1.4rem',
                  borderRadius: '10px',
                  background: connecting ? 'rgba(96,165,250,0.3)' : 'rgba(96,165,250,0.85)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: connecting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                🔵 {connecting ? 'Opening Stripe…' : 'Connect Stripe Account'}
              </button>
              {connectErr && (
                <p style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: '0.75rem', marginBottom: 0 }}>
                  {connectErr}
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        /* ── Standard text input for PayPal / Venmo / CashApp ── */
        <div style={{ marginBottom: '1.25rem' }}>
          <label className="cinematic-label">{selectedOpt?.label} Account</label>
          <input
            className="cinematic-input"
            placeholder={selectedOpt?.placeholder}
            value={account}
            onChange={(e) => { setAccount(e.target.value); setValErr(''); setSaved(false); }}
          />
          {selectedOpt?.hint && (
            <p style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)', marginTop: '0.35rem' }}>
              {selectedOpt.hint}
            </p>
          )}
        </div>
      )}

      {/* ── Validation error ────────────────────────────────── */}
      {valErr && (
        <p style={{ fontSize: '0.8rem', color: '#fca5a5', marginBottom: '0.75rem' }}>{valErr}</p>
      )}

      {/* ── Save button (hidden for Stripe unless onboarded) ─── */}
      {(!isStripe || connectStatus.onboarded) && (
        <button
          className="cinematic-button-accent"
          onClick={saveSettings}
          disabled={saving}
          style={{ marginTop: '0.25rem' }}
        >
          {saving ? 'Saving…' : 'Save Payout Settings'}
        </button>
      )}

      {/* ── Success confirmation ────────────────────────────── */}
      {saved && (
        <p style={{ fontSize: '0.85rem', color: '#86efac', marginTop: '0.75rem' }}>
          ✅ Payout settings saved.
        </p>
      )}
    </div>
  );
}
