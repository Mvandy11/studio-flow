import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { checkEventAccess } from '../../lib/checkEventAccess';

export default function EventPage() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();

  const [status,   setStatus]   = useState('checking'); // 'checking' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authLoading) return;

    async function run() {
      try {
        const { allowed, stageRoomId } = await checkEventAccess({
          supabase,
          eventId,
          user,
          role,
        });

        if (allowed) {
          navigate(`/stage/${stageRoomId}`, { replace: true });
        } else {
          navigate(`/events/${eventId}/purchase`, { replace: true });
        }
      } catch (err) {
        setErrorMsg(err.message);
        setStatus('error');
      }
    }

    run();
  }, [eventId, user, role, authLoading, navigate]);

  if (status === 'error') {
    return (
      <div className="cinematic-hero">
        <h2 className="cinematic-title">Unable to join event</h2>
        <p className="cinematic-subtitle" style={{ color: 'var(--color-muted)' }}>
          {errorMsg}
        </p>
        <button className="cinematic-button" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="cinematic-hero" style={{ textAlign: 'center' }}>
      <div className="cinematic-spinner" aria-label="Checking access..." />
      <p className="cinematic-subtitle" style={{ marginTop: '1.25rem', color: 'var(--color-muted)' }}>
        Checking access…
      </p>
    </div>
  );
}
