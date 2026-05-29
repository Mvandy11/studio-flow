import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const fmt = n => `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminRevenueTallyCards() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setError('Not authenticated'); setLoading(false); return; }
        const res = await fetch(`${API_BASE}/api/admin/revenue-summary`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `HTTP ${res.status}`); }
        setData(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
      {[...Array(4)].map((_, i) => <div key={i} className="bg-zinc-800 rounded-xl p-5 animate-pulse h-28" />)}
    </div>
  );

  if (error) return (
    <div className="my-6 p-4 bg-red-900/30 border border-red-600 rounded-xl text-red-400 text-sm">
      Revenue summary unavailable: {error}
    </div>
  );

  const cards = [
    { label: 'Contest Pool (Monthly)', value: fmt(data.contest_pool_monthly),  sub: `${data.member_30_count} × $30 + ${data.creator_50_count} × $50`, detail: '$10 each → pool', color: 'from-purple-600/20', border: 'border-purple-600/30', icon: '🏆' },
    { label: 'Event Pool (Monthly)',   value: fmt(data.event_pool_monthly),    sub: `${data.creator_50_count} Creator members`,                        detail: '$15 each → pool', color: 'from-blue-600/20',   border: 'border-blue-600/30',   icon: '🎪' },
    { label: 'Donations (All Time)',   value: fmt(data.donations_total),        sub: `This month: ${fmt(data.donations_this_month)}`,                   detail: '',                color: 'from-emerald-600/20', border: 'border-emerald-600/30', icon: '💚' },
    { label: 'Earnings Paid Out',      value: fmt(data.earnings_paid_total),    sub: `Pending: ${fmt(data.earnings_pending_total)}`,                    detail: `This month: ${fmt(data.earnings_paid_this_month)}`, color: 'from-amber-600/20', border: 'border-amber-600/30', icon: '💸' },
  ];

  return (
    <div className="my-6">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Revenue Tally</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`bg-gradient-to-br ${c.color} to-zinc-900 border ${c.border} rounded-xl p-5 flex flex-col gap-1`}>
            <div className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-wide">{c.icon} {c.label}</div>
            <div className="text-2xl font-bold text-white mt-1">{c.value}</div>
            <div className="text-xs text-zinc-400">{c.sub}</div>
            {c.detail && <div className="text-xs text-zinc-500">{c.detail}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

