import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import '../styles/portfolio.css';

const MOCK_TIPS = [
  { id: '1', label: 'Tip from @creator22',  amount: 5,  icon: '💛', date: new Date(Date.now() - 86400000 * 2) },
  { id: '2', label: 'Tip from @audiogeek',  amount: 10, icon: '💛', date: new Date(Date.now() - 86400000 * 5) },
];

export default function EarningsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    supabase
      .from('event_tickets')
      .select('*, events(title, ticket_price)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setTickets(data || []);
        setLoading(false);
      });
  }, [authLoading, user]);

  const ticketRevenue  = tickets.reduce((s, t) => s + Number(t.events?.ticket_price || 0), 0);
  const tipRevenue     = MOCK_TIPS.reduce((s, t) => s + t.amount, 0);
  const totalRevenue   = ticketRevenue + tipRevenue;

  if (authLoading || loading) return (
    <div className="earnings-page" style={{ alignItems:'center', justifyContent:'center' }}>
      <div className="cinematic-spinner" />
    </div>
  );

  if (!user) return (
    <div className="earnings-page" style={{ alignItems:'center' }}>
      <p style={{ color:'rgba(200,200,215,0.5)' }}>Log in to view your earnings.</p>
    </div>
  );

  return (
    <div className="earnings-page">
      <div className="page-header">
        <h1 className="page-title">◎ Earnings</h1>
        <p className="page-subtitle">Your revenue summary across tickets, products, and tips.</p>
      </div>

      {/* Summary Cards */}
      <div className="earnings-summary">
        <div className="earnings-summary-card earnings-summary-card--gold">
          <div className="earnings-summary-value">${totalRevenue.toFixed(2)}</div>
          <div className="earnings-summary-label">Total Earned</div>
        </div>
        <div className="earnings-summary-card earnings-summary-card--blue">
          <div className="earnings-summary-value">${ticketRevenue.toFixed(2)}</div>
          <div className="earnings-summary-label">Ticket Sales</div>
        </div>
        <div className="earnings-summary-card">
          <div className="earnings-summary-value">$0.00</div>
          <div className="earnings-summary-label">Product Sales</div>
        </div>
        <div className="earnings-summary-card earnings-summary-card--green">
          <div className="earnings-summary-value">${tipRevenue.toFixed(2)}</div>
          <div className="earnings-summary-label">Tips Received</div>
        </div>
      </div>

      {/* Ticket Sales */}
      <div>
        <h2 className="earnings-section-title">Ticket Sales</h2>
        {tickets.length === 0 ? (
          <div className="earnings-empty">
            <p>No ticket sales yet.</p>
            <p style={{ fontSize:'0.82rem', marginTop:'0.25rem' }}>
              Create events to start selling tickets.
            </p>
          </div>
        ) : (
          <div className="earnings-txn-list">
            {tickets.map((tk) => (
              <div key={tk.id} className="earnings-txn">
                <div className="earnings-txn__icon" style={{ background:'rgba(110,168,255,0.1)' }}>🎟</div>
                <div className="earnings-txn__label">{tk.events?.title || 'Event Ticket'}</div>
                <div className="earnings-txn__amount">
                  +${Number(tk.events?.ticket_price || 0).toFixed(2)}
                </div>
                <div className="earnings-txn__date">
                  {tk.created_at
                    ? formatDistanceToNow(new Date(tk.created_at), { addSuffix: true })
                    : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div>
        <h2 className="earnings-section-title">Tips & Donations</h2>
        <div className="earnings-txn-list">
          {MOCK_TIPS.map((t) => (
            <div key={t.id} className="earnings-txn">
              <div className="earnings-txn__icon" style={{ background:'rgba(242,201,143,0.1)' }}>{t.icon}</div>
              <div className="earnings-txn__label">{t.label}</div>
              <div className="earnings-txn__amount">+${t.amount.toFixed(2)}</div>
              <div className="earnings-txn__date">
                {formatDistanceToNow(t.date, { addSuffix: true })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout info */}
      <div style={{ padding:'1.25rem 1.5rem', borderRadius:'14px', background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="earnings-section-title" style={{ margin:'0 0 0.5rem' }}>Payouts</h2>
        <p style={{ fontSize:'0.88rem', color:'rgba(200,200,215,0.55)', margin:'0 0 0.75rem' }}>
          Payouts are processed monthly. Connect your payout method in{' '}
          <a href="/premier/settings" style={{ color:'var(--accent-blue)' }}>Premier Settings</a>.
        </p>
        <div style={{ fontSize:'0.85rem', color:'rgba(200,200,215,0.4)' }}>
          Pending payout: <strong style={{ color:'var(--accent-gold)' }}>${totalRevenue.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );
}
