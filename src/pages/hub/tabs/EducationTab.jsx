import { useState } from 'react';
import { EDUCATION_CATEGORIES } from '../data.js';
import { supabase } from '../../../lib/supabase.js';
import { useAuth } from '../../../hooks/useAuth.js';

export default function EducationTab({ isMember, onTicketPurchased }) {
  const { user } = useAuth();
  const [registering, setRegistering] = useState(null);
  const [registered, setRegistered] = useState(new Set());
  const [toast, setToast] = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleRegister(session) {
    if (!user) { showToast('Log in to register.', 'error'); return; }
    if (!isMember) { showToast('A Studio Flow membership is required to register.', 'error'); return; }
    if (registered.has(session.id)) return;

    setRegistering(session.id);
    try {
      const { error: e1 } = await supabase.from('hub_tickets').insert({
        user_id:     user.id,
        event_id:    session.id,
        event_title: session.title,
        ticket_type: 'paid',
        amount:      session.price,
        status:      'upcoming',
      });
      if (e1) throw e1;

      await supabase.from('hub_tickets').insert({
        user_id:     user.id,
        event_id:    session.id,
        event_title: session.title,
        ticket_type: 'free',
        amount:      0,
        status:      'upcoming',
      });

      setRegistered((prev) => new Set([...prev, session.id]));
      showToast(`📚 Registered for ${session.title}! + 1 free viewing ticket added.`);
      onTicketPurchased?.();
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
    } finally {
      setRegistering(null);
    }
  }

  return (
    <div className="hub-content">
      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:'80px', right:'1.5rem', zIndex:3000,
          padding:'0.875rem 1.25rem', borderRadius:'12px', maxWidth:'380px',
          background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
          border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}`,
          color: toast.type === 'error' ? '#fca5a5' : '#86efac',
          fontSize:'0.875rem', fontWeight:500, boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {toast.msg}
        </div>
      )}

      <div className="page-header" style={{ marginBottom:'1.5rem' }}>
        <h1 className="hub-section-title" style={{ fontSize:'1.6rem' }}>📚 Education & DIY</h1>
        <p style={{ color:'var(--hub-muted)', fontSize:'0.9rem', margin:0 }}>
          Live sessions across science, education, and DIY home improvement. Every registration includes a free viewing ticket.
        </p>
      </div>

      {!isMember && (
        <div className="member-gate" style={{ marginBottom:'1.5rem' }}>
          <p className="member-gate__text">A Studio Flow membership is required to register for sessions.</p>
          <a
            className="hub-btn hub-btn--gold"
            href="https://buy.stripe.com/6oU8wRehfa8g0ssbh3b7y0f"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration:'none', display:'inline-block', marginTop:'0.75rem' }}
          >
            Start Free Trial — $75/year
          </a>
          <p style={{ fontSize:'0.72rem', color:'var(--hub-muted)', marginTop:'0.5rem' }}>
            30-day free trial · $75/year after · No refunds.
          </p>
        </div>
      )}

      {EDUCATION_CATEGORIES.map((cat) => (
        <div key={cat.id} className="edu-category">
          <div className="edu-category__header" style={{ borderColor: cat.color }}>
            <span style={{ fontSize:'1.4rem' }}>{cat.emoji}</span>
            <h2 className="edu-category__title" style={{ color: cat.color }}>{cat.label}</h2>
          </div>
          <div className="edu-grid">
            {cat.sessions.map((session) => {
              const isRegistered = registered.has(session.id);
              return (
                <div
                  key={session.id}
                  className="edu-card"
                  style={{ borderTopColor: cat.color }}
                >
                  <h3 className="edu-card__title">{session.title}</h3>
                  <p className="edu-card__instructor">👤 {session.instructor}</p>
                  <div className="edu-card__meta">
                    <span>📅 {session.date}</span>
                    <span>⏱ {session.duration}</span>
                    <span>👥 {session.capacity} spots</span>
                  </div>
                  <p className="edu-card__desc">{session.description}</p>
                  <div className="edu-card__footer">
                    <span className="edu-card__price">${session.price}</span>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.25rem' }}>
                      <span className="event-card-hub__perk" style={{ fontSize:'0.68rem' }}>🎁 +1 free ticket</span>
                      {isRegistered ? (
                        <span className="hub-badge hub-badge--active">✓ Registered</span>
                      ) : (
                        <button
                          className="hub-btn hub-btn--blue"
                          onClick={() => handleRegister(session)}
                          disabled={registering === session.id || !isMember}
                          style={{ fontSize:'0.8rem', padding:'0.35rem 0.75rem' }}
                        >
                          {registering === session.id ? '…' : 'Register'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
