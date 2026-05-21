import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

const METHOD_OPTIONS = [
  {
    value: 'paypal',
    label: 'PayPal',
    icon: '💙',
    placeholder: 'your@email.com',
    hint: 'Enter the email address linked to your PayPal account.',
    validate: (v) => v.includes('@') || 'Enter a valid PayPal email.',
  },
  {
    value: 'venmo',
    label: 'Venmo',
    icon: '💸',
    placeholder: '@YourVenmoHandle or phone number',
    hint: 'Enter your Venmo @handle or registered phone number.',
    validate: (v) => (v.startsWith('@') || /^\+?\d{10,}$/.test(v)) || 'Enter a Venmo @handle or phone number.',
  },
  {
    value: 'stripe',
    label: 'Stripe Connect',
    icon: '🔵',
    placeholder: 'acct_XXXXXXXXXXXXXXXXXX',
    hint: 'Enter your Stripe Connect account ID (starts with acct_).',
    validate: (v) => v.startsWith('acct_') || 'Enter a valid Stripe Connect account ID (acct_…).',
  },
  {
    value: 'cashapp',
    label: 'CashApp',
    icon: '💚',
    placeholder: '$YourCashtag',
    hint: 'Enter your CashApp $cashtag.',
    validate: (v) => v.startsWith('$') || 'Enter a valid CashApp $cashtag.',
  },
];

export default function PremierSettings() {
  const { user } = useAuth();

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [valErr,   setValErr]   = useState('');

  const [method,  setMethod]  = useState('paypal');
  const [account, setAccount] = useState('');

  // Also keep legacy creator_settings fields so existing EarningsDashboard still works
  const [paypal,    setPaypal]    = useState('');
  const [venmo,     setVenmo]     = useState('');
  const [stripe,    setStripe]    = useState('');
  const [cashapp,   setCashapp]   = useState('');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    async function load() {
      const { data } = await supabase
        .from('creator_settings')
        .select('payout_method, paypal, venmo, stripe, cashapp, custom_url')
        .eq('creator_id', user.id)
        .maybeSingle();

      if (data) {
        // Map old method values → new ones
        const m = (['paypal','venmo','stripe','cashapp'].includes(data.payout_method))
          ? data.payout_method
          : 'paypal';
        setMethod(m);
        setPaypal(data.paypal   || '');
        setVenmo(data.venmo     || '');
        setStripe(data.stripe   || '');
        setCashapp(data.cashapp || '');

        // Pre-fill account field based on selected method
        const fieldMap = { paypal: data.paypal, venmo: data.venmo, stripe: data.stripe, cashapp: data.cashapp };
        setAccount(fieldMap[m] || '');
      }
      setLoading(false);
    }
    load();
  }, [user]);

  // When method changes, pre-fill account from the matching saved value
  function handleMethodChange(m) {
    setMethod(m);
    setValErr('');
    const saved = { paypal, venmo, stripe, cashapp };
    setAccount(saved[m] || '');
  }

  async function saveSettings() {
    const opt = METHOD_OPTIONS.find((o) => o.value === method);
    if (!account.trim()) { setValErr('Account info is required.'); return; }
    const validationResult = opt?.validate(account.trim());
    if (typeof validationResult === 'string') { setValErr(validationResult); return; }
    setValErr('');
    setSaving(true);
    setSaved(false);

    // Update in-memory copies
    const fieldMap = { paypal: setPaypal, venmo: setVenmo, stripe: setStripe, cashapp: setCashapp };
    fieldMap[method]?.(account.trim());

    const payload = {
      creator_id:    user.id,
      payout_method: method,
      paypal:   method === 'paypal'   ? account.trim() : paypal,
      venmo:    method === 'venmo'    ? account.trim() : venmo,
      stripe:   method === 'stripe'   ? account.trim() : stripe,
      cashapp:  method === 'cashapp'  ? account.trim() : cashapp,
    };

    const { error } = await supabase.from('creator_settings').upsert(payload);
    setSaving(false);
    if (!error) setSaved(true);
  }

  if (loading) return <div className="cinematic-title">Loading…</div>;

  if (!user) return (
    <div className="cinematic-card-xl" style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'rgba(200,200,215,0.55)', marginBottom: '1rem' }}>
        Please log in to manage your payout settings.
      </p>
    </div>
  );

  const selectedOpt = METHOD_OPTIONS.find((o) => o.value === method);

  return (
    <div className="cinematic-card-xl" style={{ padding: '2rem', maxWidth: '560px' }}>
      <h1 className="cinematic-title">Payout Settings</h1>
      <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Choose how you want to receive your earnings from Studio Flow.
      </p>

      {/* Method selector */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {METHOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleMethodChange(opt.value)}
            style={{
              padding: '0.6rem 1.1rem',
              borderRadius: '10px',
              border: method === opt.value
                ? '1px solid rgba(245,166,35,0.55)'
                : '1px solid rgba(255,255,255,0.1)',
              background: method === opt.value
                ? 'rgba(245,166,35,0.09)'
                : 'rgba(255,255,255,0.03)',
              color: method === opt.value ? '#f5a623' : 'rgba(200,200,215,0.65)',
              fontWeight: method === opt.value ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>{opt.icon}</span> {opt.label}
          </button>
        ))}
      </div>

      {/* Account input */}
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
        {valErr && (
          <p style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '0.35rem' }}>{valErr}</p>
        )}
      </div>

      <button
        className="cinematic-button-accent"
        onClick={saveSettings}
        disabled={saving}
        style={{ marginTop: '0.5rem' }}
      >
        {saving ? 'Saving…' : 'Save Payout Settings'}
      </button>

      {saved && (
        <p style={{ fontSize: '0.85rem', color: '#86efac', marginTop: '0.75rem' }}>
          ✅ Payout settings saved.
        </p>
      )}
    </div>
  );
}
