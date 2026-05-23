import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { isCreatorAdmin } from '../../lib/roles';
import { checkEventAccess } from '../../lib/checkEventAccess';
import { api } from '../../lib/api.js';
import LivePlayer from '../../components/LivePlayer';

/* ── helpers ─────────────────────────────────────────────────── */
function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function useCountdown(targetIso) {
  const [diff, setDiff] = useState(null);
  useEffect(() => {
    if (!targetIso) return;
    function tick() {
      const ms = new Date(targetIso) - Date.now();
      setDiff(ms > 0 ? ms : 0);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (diff === null || diff <= 0) return null;
  const totalSecs = Math.floor(diff / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return { d, h, m, s };
}

function VideoPlayer({ url }) {
  if (!url) return null;
  const isEmbed = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');

  if (isEmbed) {
    let src = url;
    if (url.includes('youtu.be/')) {
      src = `https://www.youtube.com/embed/${url.split('youtu.be/')[1].split('?')[0]}`;
    } else if (url.includes('youtube.com/watch')) {
      const v = new URL(url).searchParams.get('v');
      src = `https://www.youtube.com/embed/${v}`;
    } else if (url.includes('vimeo.com/')) {
      const id = url.split('vimeo.com/')[1].split('?')[0];
      src = `https://player.vimeo.com/video/${id}`;
    }
    return (
      <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: '16px', overflow: 'hidden', background: '#000', marginBottom: '2rem' }}>
        <iframe
          src={src}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Event video"
        />
      </div>
    );
  }

  return (
    <video
      src={url}
      controls
      style={{ width: '100%', borderRadius: '16px', background: '#000', marginBottom: '2rem', maxHeight: '520px' }}
    />
  );
}

/* ── WinnerModal ─────────────────────────────────────────────── */
function WinnerModal({ winner, drawing, onClose, onSendPayout }) {
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [sendErr, setSendErr] = useState('');

  async function handleSend() {
    setSending(true);
    setSendErr('');
    try {
      await onSendPayout();
      setSent(true);
    } catch (err) {
      setSendErr(err.message || 'Payout failed.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: '#13131a', border: '1px solid rgba(245,166,35,0.3)',
        borderRadius: '20px', padding: '2rem', maxWidth: '480px', width: '100%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎰</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#f5a623' }}>Drawing Winner!</h2>
          <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.82rem', marginTop: '0.35rem' }}>
            {drawing.eventTitle}
          </p>
        </div>

        {/* Winner details */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(245,166,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
              {winner.avatarUrl
                ? <img src={winner.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : '🎟'
              }
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{winner.name}</div>
              {winner.email && (
                <div style={{ fontSize: '0.8rem', color: 'rgba(200,200,215,0.5)' }}>{winner.email}</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.83rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.6rem 0.85rem' }}>
              <div style={{ color: 'rgba(200,200,215,0.4)', marginBottom: '0.2rem' }}>Total Pot</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f5a623' }}>${drawing.totalPot.toFixed(2)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.6rem 0.85rem' }}>
              <div style={{ color: 'rgba(200,200,215,0.4)', marginBottom: '0.2rem' }}>Total Entries</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{drawing.totalEntries}</div>
            </div>
          </div>
        </div>

        {/* Payout method */}
        <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          {winner.hasPayoutMethod ? (
            <p style={{ color: 'rgba(200,200,215,0.65)', margin: 0 }}>
              Payout via: <strong style={{ color: '#fff' }}>{winner.payoutMethod?.toUpperCase()}</strong>
              {winner.payoutAccount && <> — <code style={{ color: '#f5a623' }}>{winner.payoutAccount}</code></>}
            </p>
          ) : (
            <p style={{ color: '#fca5a5', margin: 0 }}>
              ⚠ Winner has not set up a payout method. They must add one in their account settings before you can send payment.
            </p>
          )}
        </div>

        {sendErr && (
          <p style={{ color: '#fca5a5', fontSize: '0.83rem', marginBottom: '0.75rem' }}>{sendErr}</p>
        )}
        {sent && (
          <p style={{ color: '#86efac', fontSize: '0.83rem', marginBottom: '0.75rem' }}>✅ Payout initiated successfully! Check Payout Logs for status.</p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {!sent && winner.hasPayoutMethod && (
            <button
              className="cinematic-button-accent"
              onClick={handleSend}
              disabled={sending}
              style={{ flex: 1, minWidth: '140px' }}
            >
              {sending ? 'Sending…' : `💸 Send Payout — $${drawing.totalPot.toFixed(2)}`}
            </button>
          )}
          <button
            className="cinematic-button"
            onClick={onClose}
            style={{ flex: 1, minWidth: '100px' }}
          >
            {sent ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main component ─────────────────────────────────────────── */
export default function EventDetailsPage() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();

  const [event,    setEvent]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [joining,  setJoining]  = useState(false);

  // Drawing pot
  const [entryCount,   setEntryCount]   = useState(0);
  const [potLoading,   setPotLoading]   = useState(false);

  // Admin winner picker
  const [picking,      setPicking]      = useState(false);
  const [pickErr,      setPickErr]      = useState('');
  const [winnerResult, setWinnerResult] = useState(null);

  const countdown = useCountdown(event?.start_time || event?.starts_at);
  const isAdmin = isCreatorAdmin(role);

  useEffect(() => {
    async function load() {
      try {
        const json = await api(`/api/events/${eventId}`);
        setEvent(json.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  // Fetch drawing entry count when event loads
  useEffect(() => {
    if (!event?.drawing_enabled) return;
    setPotLoading(true);
    supabase
      .from('ticket_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('drawing_entry', true)
      .then(({ count }) => {
        setEntryCount(count || 0);
        setPotLoading(false);
      });
  }, [event, eventId]);

  const handleJoinLive = useCallback(async () => {
    if (!user) { navigate(`/events/${eventId}/purchase`); return; }
    setJoining(true);
    try {
      const { allowed, stageRoomId } = await checkEventAccess({
        supabase, eventId, user, role,
      });
      if (allowed && stageRoomId) {
        navigate(`/stage/${stageRoomId}`);
      } else {
        navigate(`/events/${eventId}/purchase`);
      }
    } catch (_) {
      navigate(`/events/${eventId}/purchase`);
    } finally {
      setJoining(false);
    }
  }, [user, role, eventId, navigate]);

  async function handlePickWinner() {
    setPicking(true);
    setPickErr('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await api(`/api/events/${eventId}/pick-winner`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      });
      setWinnerResult(result);
    } catch (err) {
      setPickErr(err.message || 'Could not pick a winner.');
    } finally {
      setPicking(false);
    }
  }

  async function handleSendPayout() {
    if (!winnerResult) return;
    const { data: { session } } = await supabase.auth.getSession();
    await api('/api/payouts/initiate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        userId:  winnerResult.winner.userId,
        eventId,
        amount:  winnerResult.drawing.totalPot,
        method:  winnerResult.winner.payoutMethod,
        note:    `Drawing winner — ${winnerResult.drawing.eventTitle}`,
      }),
    });
  }

  if (loading) return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <div className="cinematic-spinner" />
    </div>
  );

  if (error || !event) return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎟</p>
      <p style={{ color: 'rgba(200,200,215,0.5)' }}>{error || 'Event not found.'}</p>
      <Link to="/events" className="btn" style={{ textDecoration: 'none', marginTop: '1rem', display: 'inline-block' }}>
        ← Back to Events
      </Link>
    </div>
  );

  const eventMode    = event.event_mode || event.event_type || (event.stage_room_id ? 'live' : 'recorded');
  const isLive       = eventMode === 'live';
  const isRecorded   = eventMode === 'recorded';
  const eventStatus  = event.status || 'upcoming';
  const isPaid       = event.is_paid || event.is_paid_event;
  const price        = Number(event.price ?? event.ticket_price ?? 0);
  const dateStr      = formatDate(event.start_time || event.starts_at);
  const videoUrl     = event.video_url;
  const thumbnail    = event.thumbnail_url || event.image_url;
  const drawingEnabled = !!event.drawing_enabled;
  const drawingAmount  = Number(event.drawing_amount || 0);
  const totalPot       = drawingAmount * entryCount;

  /* live status badge colour */
  const statusMeta = {
    live:      { label: '🔴 Live Now',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
    upcoming:  { label: '📅 Upcoming',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
    ended:     { label: '✅ Ended',       color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
    cancelled: { label: '🚫 Cancelled',  color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  };
  const sm = statusMeta[eventStatus] ?? statusMeta.upcoming;

  return (
    <div className="page-container" style={{ maxWidth: '760px', margin: '0 auto' }}>
      {/* Winner Modal */}
      {winnerResult && (
        <WinnerModal
          winner={winnerResult.winner}
          drawing={winnerResult.drawing}
          onClose={() => setWinnerResult(null)}
          onSendPayout={handleSendPayout}
        />
      )}

      {/* Back */}
      <Link to="/events" style={{ fontSize: '0.82rem', color: 'rgba(200,200,215,0.45)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>
        ← Events
      </Link>

      {/* Thumbnail */}
      {thumbnail && !isRecorded && (
        <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', background: '#111', marginBottom: '1.75rem' }}>
          <img src={thumbnail} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Live stream player */}
      {isLive && event.live_stream_url && eventStatus !== 'ended' && (
        <LivePlayer url={event.live_stream_url} label={event.title} />
      )}

      {/* Video player (recorded events) */}
      {isRecorded && videoUrl && <VideoPlayer url={videoUrl} />}

      {/* Empty video placeholder */}
      {isRecorded && !videoUrl && (
        <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
          <span style={{ fontSize: '2.5rem' }}>🎬</span>
          <p style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.85rem' }}>Video coming soon</p>
        </div>
      )}

      {/* Badges row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', background: sm.bg, color: sm.color, border: `1px solid ${sm.color}44` }}>
          {sm.label}
        </span>
        <span style={{ padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', background: isLive ? 'rgba(167,139,250,0.12)' : 'rgba(52,211,153,0.12)', color: isLive ? '#a78bfa' : '#34d399', border: `1px solid ${isLive ? '#a78bfa44' : '#34d39944'}` }}>
          {isLive ? '📡 Live Event' : '🎬 Pre‑Recorded'}
        </span>
        <span style={{ padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: price === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(245,166,35,0.12)', color: price === 0 ? '#22c55e' : '#f5a623', border: `1px solid ${price === 0 ? '#22c55e44' : '#f5a62344'}` }}>
          {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
        </span>
        {drawingEnabled && (
          <span style={{ padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(245,166,35,0.15)', color: '#f5a623', border: '1px solid rgba(245,166,35,0.35)' }}>
            🎰 Drawing Pot
          </span>
        )}
      </div>

      {/* Title */}
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.2, margin: '0 0 0.75rem' }}>{event.title}</h1>

      {/* Meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', color: 'rgba(200,200,215,0.5)', fontSize: '0.83rem' }}>
        {dateStr && <span>📅 {dateStr}</span>}
        {event.duration_minutes && <span>⏱ {event.duration_minutes} min</span>}
        {event.location && <span>📍 {event.location}</span>}
      </div>

      {/* Description */}
      {event.description && (
        <p style={{ color: 'rgba(200,200,215,0.65)', lineHeight: 1.65, marginBottom: '2rem', fontSize: '0.92rem' }}>
          {event.description}
        </p>
      )}

      {/* ── Drawing Pot Panel ──────────────────────────────────── */}
      {drawingEnabled && (
        <div style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#f5a623', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🎰 Drawing Pot
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: isAdmin ? '1.25rem' : 0 }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.4)', marginBottom: '0.3rem' }}>
                Total Pot
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f5a623' }}>
                {potLoading ? '…' : `$${totalPot.toFixed(2)}`}
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.4)', marginBottom: '0.3rem' }}>
                Entries
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                {potLoading ? '…' : entryCount}
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)', margin: 0 }}>
            ${drawingAmount.toFixed(2)} from each ticket goes into the pot. Every ticket purchase = 1 entry.
          </p>

          {/* Admin: Pick Winner */}
          {isAdmin && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                className="cinematic-button-accent"
                onClick={handlePickWinner}
                disabled={picking || entryCount === 0}
                style={{ fontSize: '0.9rem' }}
              >
                {picking ? 'Picking…' : '🎲 Pick Random Winner'}
              </button>
              {entryCount === 0 && !potLoading && (
                <p style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.35)', marginTop: '0.5rem' }}>
                  No entries yet.
                </p>
              )}
              {pickErr && (
                <p style={{ fontSize: '0.82rem', color: '#fca5a5', marginTop: '0.5rem' }}>{pickErr}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Countdown (upcoming live events) */}
      {isLive && eventStatus === 'upcoming' && countdown && (
        <div style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.18)', borderRadius: '14px', padding: '1.25rem', marginBottom: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(200,200,215,0.45)', marginBottom: '0.75rem' }}>Starts in</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
            {[['d', countdown.d], ['h', countdown.h], ['m', countdown.m], ['s', countdown.s]].map(([label, val]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>{String(val).padStart(2, '0')}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(200,200,215,0.35)', textTransform: 'uppercase', marginTop: '0.25rem' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Donation button ── */}
      <div style={{
        padding: '1.1rem 1.4rem',
        background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)',
        borderRadius: '14px', marginBottom: '1.75rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: '#f5a623', fontSize: '0.92rem' }}>💛 Support This Event</p>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'rgba(200,200,215,0.45)' }}>
            Any amount helps keep Studio Flow events running.
          </p>
        </div>
        <a
          href="https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '0.55rem 1.2rem', borderRadius: '9px',
            background: 'rgba(245,166,35,0.16)', border: '1px solid rgba(245,166,35,0.3)',
            color: '#f5a623', fontWeight: 800, fontSize: '0.88rem', textDecoration: 'none',
          }}
        >
          Donate ❤️
        </a>
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {isLive && (eventStatus === 'live' || eventStatus === 'upcoming') && (
          <button
            className="btn btn--primary"
            onClick={handleJoinLive}
            disabled={joining || authLoading}
            style={{ minWidth: '160px' }}
          >
            {joining ? 'Connecting…' : eventStatus === 'live' ? '🔴 Join Live Now' : '📅 Get Access'}
          </button>
        )}

        {isRecorded && isPaid && !videoUrl && (
          <Link to={`/events/${eventId}/purchase`} className="btn btn--primary" style={{ textDecoration: 'none' }}>
            🎟 Get Access
          </Link>
        )}

        {eventStatus === 'ended' && isLive && (
          <p style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.85rem', alignSelf: 'center' }}>
            This event has ended. {!videoUrl && 'A replay may be added soon.'}
          </p>
        )}

        <Link to="/events" className="btn" style={{ textDecoration: 'none' }}>
          ← Back
        </Link>
      </div>
    </div>
  );
}
