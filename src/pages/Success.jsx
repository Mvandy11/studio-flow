import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { popTicketIntent } from '../lib/stripeLinks.js';

export default function Success() {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState('checking'); // checking | saving | done | error | generic
  const [ticketInfo, setTicketInfo] = useState(null);

  useEffect(() => {
    if (loading) return;

    const intent = popTicketIntent();

    // No ticket intent — could be a subscription success
    if (!intent) {
      setStatus('generic');
      return;
    }

    // Validate the intent belongs to the current user
    if (!user || intent.userId !== user.id) {
      setStatus('generic');
      return;
    }

    setTicketInfo(intent);
    setStatus('saving');

    (async () => {
      try {
        // 1. Insert paid ticket (view + attend/vote)
        const { error: e1 } = await supabase.from('hub_tickets').insert({
          user_id:     intent.userId,
          event_id:    intent.eventId,
          event_title: intent.eventTitle,
          ticket_type: intent.ticketType,   // 'paid' or 'voting'
          amount:      intent.amount,
          status:      'upcoming',
        });
        if (e1) throw e1;

        // 2. Issue free view-only companion ticket automatically
        await supabase.from('hub_tickets').insert({
          user_id:     intent.userId,
          event_id:    intent.eventId,
          event_title: intent.eventTitle,
          ticket_type: 'free',              // view-only, no voting
          amount:      0,
          status:      'upcoming',
        });

        setStatus('done');
      } catch (err) {
        console.error('Ticket save error:', err);
        setStatus('error');
      }
    })();
  }, [user, loading]);

  // ── UI states ───────────────────────────────────────────────

  if (status === 'checking' || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="cinematic-spinner" />
      </div>
    );
  }

  if (status === 'saving') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="cinematic-spinner" />
        <p style={{ color: 'var(--text-soft)', fontSize: '0.95rem' }}>Saving your ticket…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center', padding: '0 1.5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚠️</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Payment received!</h1>
        <p style={{ color: 'var(--text-soft)', marginBottom: '1.5rem' }}>
          Your payment went through but we had trouble saving the ticket automatically.
          Please contact <strong>obviouslyinspiredstudio@outlook.com</strong> and we'll sort it out immediately.
        </p>
        <Link to="/" className="hub-btn hub-btn--gold" style={{ textDecoration: 'none' }}>
          Back to Studio Flow
        </Link>
      </div>
    );
  }

  if (status === 'generic') {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center', padding: '0 1.5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌟</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--accent-gold, #f5a623)' }}>
          Your Studio Flow subscription is active.
        </h1>
        <p style={{ color: 'var(--text-soft)', marginBottom: '1.75rem' }}>
          Welcome to the Studio Flow community. Enter contests, buy tickets, and vote.
        </p>
        <Link to="/" className="hub-btn hub-btn--gold" style={{ textDecoration: 'none' }}>
          Go to Studio Flow →
        </Link>
      </div>
    );
  }

  // status === 'done'
  const isContest = ticketInfo?.category === 'contest';
  const paidType  = ticketInfo?.ticketType === 'voting' ? 'Viewing + Voting Ticket' : 'Admission Ticket';

  return (
    <div style={{ maxWidth: '520px', margin: '4rem auto', padding: '0 1.5rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--hub-gold, #f5a623)', margin: '0 0 0.4rem' }}>
          Payment Successful!
        </h1>
        <p style={{ color: 'var(--text-soft)', margin: 0 }}>
          Your tickets have been added to your account.
        </p>
      </div>

      {/* Ticket summary */}
      <div style={{
        background: 'var(--hub-card, #111d33)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '1.5rem',
      }}>
        {/* Paid ticket */}
        <div style={{ padding: '1.125rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245,166,35,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
            🎟
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 0.15rem', fontWeight: 700, fontSize: '0.95rem' }}>
              {ticketInfo?.eventTitle}
            </p>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--hub-muted, #8b9fc5)' }}>
              {paidType} · {isContest ? 'Watch submissions & vote' : 'View + attend'}
            </p>
          </div>
          <span style={{ fontWeight: 800, color: 'var(--hub-gold, #f5a623)', fontSize: '1rem' }}>
            ${ticketInfo?.amount}
          </span>
        </div>

        {/* Free companion ticket */}
        <div style={{ padding: '1.125rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
            🎁
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 0.15rem', fontWeight: 700, fontSize: '0.95rem' }}>
              {ticketInfo?.eventTitle}
            </p>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--hub-muted, #8b9fc5)' }}>
              Free Viewing Ticket · View-only (no voting)
            </p>
          </div>
          <span style={{ fontWeight: 800, color: '#22c55e', fontSize: '1rem' }}>FREE</span>
        </div>
      </div>

      {/* Stripe confirmation note */}
      <div style={{
        padding: '0.75rem 1rem', borderRadius: '10px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        fontSize: '0.8rem', color: 'var(--hub-muted, #8b9fc5)',
        marginBottom: '1.5rem', textAlign: 'center',
      }}>
        🔒 Payment processed securely via Stripe. A receipt was sent to your email.
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" className="hub-btn hub-btn--gold" style={{ textDecoration: 'none' }}>
          {isContest ? '🗳 Go Vote Now' : '🎟 View My Tickets'}
        </Link>
        <Link to="/" className="hub-btn hub-btn--ghost" style={{ textDecoration: 'none' }}>
          Back to Studio Flow
        </Link>
      </div>
    </div>
  );
}
