import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth.js';
import { supabase } from '../../../lib/supabase.js';
import { formatDistanceToNow } from 'date-fns';

export default function MyTicketsTab({ refreshKey }) {
  const { user, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) { setLoading(false); return; }
    async function load() {
      setLoading(true);
      try {
        const { data: allTickets } = await supabase
          .from('event_tickets')
          .select('id, event_id, ticket_type, amount, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const rows = (allTickets || []).map((t) => {
          const isFree = t.ticket_type === 'view_only' || t.ticket_type === 'free';
          return {
            ...t,
            ticket_type:  isFree ? 'free' : (t.ticket_type || 'paid'),
            event_title:  t.event_id || 'Event',
            purchased_at: t.created_at,
            status:       t.status || 'upcoming',
            amount:       isFree ? 0 : (t.amount || 0),
          };
        });
        setTickets(rows);
      } catch (_) {
        setTickets([]);
      }
      setLoading(false);
    }
    load();
  }, [user, authLoading, refreshKey]);

  if (!user) {
    return (
      <div className="hub-content" style={{ textAlign:'center', paddingTop:'4rem' }}>
        <p style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>🎫</p>
        <p style={{ color:'var(--hub-muted)' }}>Log in to view your tickets.</p>
      </div>
    );
  }

  if (loading) return (
    <div className="hub-content" style={{ textAlign:'center', paddingTop:'4rem' }}>
      <div className="cinematic-spinner" />
    </div>
  );

  const paid   = tickets.filter((t) => t.ticket_type === 'paid');
  const free   = tickets.filter((t) => t.ticket_type === 'free');
  const totalSpent = paid.reduce((s, t) => s + Number(t.amount || 0), 0);

  function ticketIcon(type) {
    return type === 'free' ? '🎁' : '🎟';
  }

  function TicketList({ items, emptyMsg }) {
    if (items.length === 0) {
      return (
        <div style={{ padding:'2rem', textAlign:'center', color:'var(--hub-muted)', fontSize:'0.875rem', background:'rgba(255,255,255,0.02)', borderRadius:'12px', border:'1px solid var(--hub-border)' }}>
          {emptyMsg}
        </div>
      );
    }
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
        {items.map((tk) => (
          <div key={tk.id} className="ticket-item">
            <div
              className="ticket-item__icon"
              style={{ background: tk.ticket_type === 'free' ? 'rgba(34,197,94,0.1)' : 'rgba(245,166,35,0.1)' }}
            >
              {ticketIcon(tk.ticket_type)}
            </div>
            <div className="ticket-item__body">
              <p className="ticket-item__title">{tk.event_title}</p>
              <p className="ticket-item__meta">
                <span className={`hub-badge hub-badge--${tk.ticket_type}`} style={{ fontSize:'0.65rem', marginRight:'0.4rem' }}>
                  {tk.ticket_type === 'free' ? 'Free Viewing' : 'Paid'}
                </span>
                <span className={`hub-badge hub-badge--${tk.status === 'upcoming' ? 'open' : 'closed'}`} style={{ fontSize:'0.65rem', marginRight:'0.5rem' }}>
                  {tk.status}
                </span>
                {tk.purchased_at && (
                  <span style={{ color:'var(--hub-muted)', fontSize:'0.75rem' }}>
                    {formatDistanceToNow(new Date(tk.purchased_at), { addSuffix: true })}
                  </span>
                )}
              </p>
            </div>
            <div className="ticket-item__amount">
              {tk.ticket_type === 'free' ? 'FREE' : `$${Number(tk.amount).toFixed(2)}`}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="hub-content">
      <div className="page-header" style={{ marginBottom:'1.5rem' }}>
        <h1 className="hub-section-title" style={{ fontSize:'1.6rem' }}>🎫 My Tickets</h1>
        <p style={{ color:'var(--hub-muted)', fontSize:'0.9rem', margin:0 }}>All your purchased and complimentary tickets.</p>
      </div>

      {/* Summary */}
      <div className="tickets-summary">
        <div className="tickets-stat">
          <div className="tickets-stat__value">{paid.length}</div>
          <div className="tickets-stat__label">Purchased</div>
        </div>
        <div className="tickets-stat">
          <div className="tickets-stat__value">{free.length}</div>
          <div className="tickets-stat__label">Free Earned</div>
        </div>
        <div className="tickets-stat">
          <div className="tickets-stat__value">${totalSpent.toFixed(2)}</div>
          <div className="tickets-stat__label">Total Spent</div>
        </div>
      </div>

      {/* Purchased */}
      <div style={{ marginBottom:'2rem' }}>
        <h2 className="hub-section-title">🎟 Purchased Tickets</h2>
        <TicketList items={paid} emptyMsg="No purchased tickets yet. Browse events or sessions to get started." />
      </div>

      {/* Free */}
      <div>
        <h2 className="hub-section-title">🎁 Free Viewing Tickets</h2>
        <TicketList items={free} emptyMsg="Free viewing tickets appear here automatically when you buy any ticket." />
      </div>
    </div>
  );
}
