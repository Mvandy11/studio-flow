import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Wallet } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || '';
const fmt = n => `$${Number(n ?? 0).toFixed(2)}`;

export default function AdminPayoutPanel() {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [paying, setPaying]     = useState(null); // creatorId currently processing
  const [toast, setToast]       = useState(null);

  async function getJwt() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function load() {
    setLoading(true);
    const jwt = await getJwt();
    const res = await fetch(`${API}/api/admin/payout/list`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const body = await res.json();
    setCreators(body.creators || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function payStripe(creator) {
    const amount = creator.pending_earnings + creator.requested_earnings;
    if (amount <= 0) return showToast('No pending earnings to pay.', false);
    setPaying(creator.creator_id);
    const jwt = await getJwt();
    const res = await fetch(`${API}/api/admin/payout/stripe`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ creatorId: creator.creator_id, amountDollars: amount }),
    });
    const body = await res.json();
    setPaying(null);
    if (res.ok) { showToast(`✅ Sent ${fmt(amount)} to ${creator.username} via Stripe`); load(); }
    else showToast(`❌ ${body.error}`, false);
  }

  async function markPaid(creator) {
    const amount = creator.pending_earnings + creator.requested_earnings;
    if (amount <= 0) return showToast('No pending earnings to pay.', false);
    setPaying(creator.creator_id);
    const jwt = await getJwt();
    const res = await fetch(`${API}/api/admin/payout/manual-complete`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        creatorId:    creator.creator_id,
        amountDollars: amount,
        method:       creator.payout_method,
        note:         `Manual payout via ${creator.payout_method}`,
      }),
    });
    const body = await res.json();
    setPaying(null);
    if (res.ok) { showToast(`✅ Marked ${fmt(amount)} paid to ${creator.username}`); load(); }
    else showToast(`❌ ${body.error}`, false);
  }

  function payoutAddress(c) {
    if (c.payout_method === 'paypal')  return c.paypal   || '—';
    if (c.payout_method === 'venmo')   return c.venmo    || '—';
    if (c.payout_method === 'cashapp') return c.cashapp  || '—';
    if (c.payout_method === 'stripe')  return c.stripe_connect_onboarded ? `Connected ✅` : 'Not onboarded ⚠️';
    return '—';
  }

  if (loading) return (
    <div className="animate-pulse space-y-3 my-6">
      {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-zinc-800 rounded-xl" />)}
    </div>
  );

  if (!creators.length) return (
    <div className="my-6 p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-400 text-sm">
      No creators with configured payout methods yet.
    </div>
  );

  return (
    <div className="my-6">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
        Creator Payouts
      </h3>

      {toast && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${toast.ok ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700' : 'bg-red-900/40 text-red-300 border border-red-700'}`}>
          {toast.msg}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-700">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800 text-zinc-400 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Creator</th>
              <th className="px-4 py-3 text-left">Method</th>
              <th className="px-4 py-3 text-left">Send To</th>
              <th className="px-4 py-3 text-right">Pending</th>
              <th className="px-4 py-3 text-right">Requested</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {creators.map(c => {
              const total    = c.pending_earnings + c.requested_earnings;
              const isStripe = c.payout_method === 'stripe';
              const canPay   = total > 0;
              const busy     = paying === c.creator_id;

              return (
                <tr key={c.creator_id} className="bg-zinc-900 hover:bg-zinc-800/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{c.username || 'Unknown'}</div>
                    <div className="text-xs text-zinc-500">{c.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-zinc-400" />
                      <span className="capitalize text-zinc-300">{c.payout_method}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{payoutAddress(c)}</td>
                  <td className="px-4 py-3 text-right text-amber-400 font-medium">{fmt(c.pending_earnings)}</td>
                  <td className="px-4 py-3 text-right text-blue-400 font-medium">{fmt(c.requested_earnings)}</td>
                  <td className="px-4 py-3 text-center">
                    {isStripe && c.stripe_connect_onboarded ? (
                      <button
                        onClick={() => payStripe(c)}
                        disabled={!canPay || busy}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                      >
                        {busy ? 'Sending…' : `Pay ${fmt(total)} via Stripe`}
                      </button>
                    ) : isStripe ? (
                      <span className="text-xs text-amber-500">Stripe not onboarded</span>
                    ) : (
                      <button
                        onClick={() => markPaid(c)}
                        disabled={!canPay || busy}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                      >
                        {busy ? 'Saving…' : `Mark Paid ${fmt(total)}`}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
