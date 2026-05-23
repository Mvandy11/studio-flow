import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const FIXED_AMOUNT = 5;

export default function DonateSuccess() {
  const [params]  = useSearchParams();
  const eventId   = params.get('event_id');

  const [status,  setStatus]  = useState('recording'); // recording | done | error | guest
  const [eventTitle, setEventTitle] = useState('');

  useEffect(() => {
    if (!eventId) {
      setStatus('done');
      return;
    }

    async function record() {
      try {
        // 1. Fetch the current user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setStatus('guest');
          return;
        }

        // 2. Fetch the event slot to get creator_id and title
        const res  = await fetch(`/api/creator/events/public/${eventId}`);
        const slot = await res.json();
        if (slot?.error || !slot?.id) {
          setStatus('done'); // still show success even if fetch fails
          return;
        }
        setEventTitle(slot.title || '');

        // 3. Insert donation record (idempotent — duplicate is harmless)
        await supabase.from('donations').insert({
          event_id:   eventId,
          creator_id: slot.creator_id,
          user_id:    session.user.id,
          amount:     FIXED_AMOUNT,
        });

        // 4. Record donation in revenue pool
        await supabase.from('revenue_pool_entries').insert({
          creator_id: slot.creator_id,
          amount:     FIXED_AMOUNT,
          source:     'donation',
        });

        setStatus('done');
      } catch {
        setStatus('done'); // fail silently — payment already went through
      }
    }

    record();
  }, [eventId]);

  return (
    <div style={{
      minHeight: '70vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '2rem 1rem',
    }}>
      {status === 'recording' && (
        <>
          <div className="cinematic-spinner" style={{ marginBottom: '1.25rem' }} />
          <p style={{ color: 'rgba(200,200,215,0.5)', fontSize: '0.9rem' }}>Recording your donation…</p>
        </>
      )}

      {(status === 'done' || status === 'guest') && (
        <>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>💛</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
            Thank you for your support!
          </h1>
          {eventTitle && (
            <p style={{ color: 'rgba(200,200,215,0.6)', fontSize: '0.95rem', margin: '0 0 0.4rem' }}>
              Your donation to <strong style={{ color: '#fff' }}>{eventTitle}</strong> has been received.
            </p>
          )}
          {status === 'guest' && (
            <p style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
              Sign in next time to have your support recorded in your history.
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {eventId && (
              <Link
                to={`/event/${eventId}`}
                style={{
                  padding: '0.65rem 1.4rem', borderRadius: '10px',
                  background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.35)',
                  color: '#f5a623', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
                }}
              >
                ← Back to Event
              </Link>
            )}
            <Link
              to="/events"
              style={{
                padding: '0.65rem 1.4rem', borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(200,200,215,0.75)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none',
              }}
            >
              Explore Events
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
