import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function DonateSuccess() {
  const [params]  = useSearchParams();
  const eventId   = params.get('event_id');
  const amount    = params.get('amount');

  const [status,     setStatus]     = useState('recording');
  const [eventTitle, setEventTitle] = useState('');

  useEffect(() => {
    record();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function record() {
    if (!eventId) {
      setStatus('done');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/donations/record', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          event_id: eventId,
          amount:   amount ? Number(amount) : 5,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (json.event_title) setEventTitle(json.event_title);

      if (!res.ok) {
        console.warn('[DonateSuccess] record failed:', json.error);
      }

      setStatus(session?.user ? 'done' : 'guest');
    } catch (err) {
      console.warn('[DonateSuccess] record error:', err.message);
      setStatus('done');
    }
  }

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
