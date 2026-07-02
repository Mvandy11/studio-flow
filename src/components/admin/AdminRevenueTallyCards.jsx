import { DollarSign, Users, TrendingUp } from 'lucide-react';
import { REVENUE_CONFIG as RC } from '../../config/revenueConfig';

export default function AdminRevenueTallyCards({ counts = {}, totals = {} }) {
  const founding  = counts.founding  ?? 0;
  const standard  = counts.standard  ?? 0;
  const totalMembers = founding + standard;

  const contestPool   = (founding * RC.founding.contestPool) + (standard * RC.standard.contestPool);
  const myProfit      = (founding * RC.founding.myProfit)    + (standard * RC.standard.myProfit);
  const totalRevenue  = (founding * RC.founding.price)       + (standard * RC.standard.price);

  const cards = [
    {
      label: 'Monthly Revenue',
      value: `$${totalRevenue.toFixed(2)}`,
      sub: `${founding} founding × $${RC.founding.price} + ${standard} premier × $${RC.standard.price}`,
      icon: <DollarSign className="w-5 h-5" />,
      color: '#f2c98f',
    },
    {
      label: 'Contest Pool (Monthly)',
      value: `$${contestPool.toFixed(2)}`,
      sub: `$${RC.founding.contestPool}/founding · $${RC.standard.contestPool}/premier`,
      icon: <TrendingUp className="w-5 h-5" />,
      color: '#34d399',
    },
    {
      label: 'My Profit (Monthly)',
      value: `$${myProfit.toFixed(2)}`,
      sub: `$${RC.founding.myProfit}/founding · $${RC.standard.myProfit}/premier`,
      icon: <DollarSign className="w-5 h-5" />,
      color: '#a78bfa',
    },
    {
      label: 'Active Members',
      value: totalMembers,
      sub: `${founding} Founding · ${standard} Premier`,
      icon: <Users className="w-5 h-5" />,
      color: '#60a5fa',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      {cards.map((c) => (
        <div key={c.label} style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: c.color, marginBottom: '0.5rem' }}>
            {c.icon}
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>{c.value}</div>
          <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.25rem' }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
