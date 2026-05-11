import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api.js';

/**
 * Dual-mode slot view:
 *   • Creator (slot owner) → format chooser + stream key / video upload
 *   • Public viewer         → ticket purchase UI
 */
export default function EventSlotView() {
  const { slotId }          = useParams();
  const { user, loading: authLoading } = useAuth();

  const [slot,        setSlot]        = useState(null);
  const [event,       setEvent]       = useState(null);  // linked events row
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [buying,      setBuying]      = useState(false);

  // Creator mode state
  const [choosingMode,  setChoosingMode]  = useState(false);
  const [modeError,     setModeError]     = useState('');
  const [videoUrl,      setVideoUrl]      = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [slotId, authLoading]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('event_slots')
        .select('id, title, description, price, event_type, event_mode, user_id, video_url, stream_key')
        .eq('id', slotId)
        .maybeSingle();

      if (err || !data) { setError('Event not found.'); setLoading(false); return; }
      setSlot(data);

      // Load linked events row (created at slot approval time)
      const { data: linked } = await supabase
        .from('events')
        .select('id, event_mode, stream_key, stream_url, video_url, status')
        .eq('live_room_id', slotId)
        .maybeSingle();

      setEvent(linked || null);
    } finally {
      setLoading(false);
    }
  }

  async function handleChooseMode(mode) {
    setChoosingMode(true);
    setModeError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setModeError('You must be logged in.'); return; }

      const body = { event_mode: mode };
      if (mode === 'recorded' && videoUrl.trim()) body.video_url = videoUrl.trim();

      await api(`/api/slots/${slotId}/event-mode`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify(body),
      });
      await load();
    } catch (err) {
      setModeError(err.message);
    } finally {
      setChoosingMode(false);
    }
  }

  async function handlePurchase() {
    setBuying(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please log in to purchase access.'); setBuying(false); return; }

      const json = await api('/api/payments/create-event-payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer session.access_token` },
        body:    JSON.stringify({ event_slot_id: slotId, amount: slot.price }),
      });

      if (json.url && !json.url.startsWith('REPLACE_')) {
        window.location.href = json.url;
      } else {
        setError('Payment link not yet configured. Contact Studio Flow administration.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBuying(false);
    }
  }

  if (loading || authLoading) return (
    <div style={page}>
      <div className="cinematic-spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
    </div>
  );

  if (error && !slot) return (
    <div style={page}>
      <div style={card}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
        <p style={{ color: '#fca5a5', fontSize: '0.95rem' }}>{error}</p>
        <Link to="/events" style={{ color: 'var(--accent-blue)', fontSize: '0.85rem' }}>← Back to Events</Link>
      </div>
    </div>
  );

  const isOwner    = user && slot && user.id === slot.user_id;
  const effectMode = event?.event_mode || slot?.event_mode || null;
  const streamKey  = event?.stream_key || slot?.stream_key || null;
  const slotVideo  = event?.video_url  || slot?.video_url  || null;
  const isOpen     = slot?.event_type  === 'open';
  const price      = Number(slot?.price ?? 0);

  /* ── CREATOR VIEW ────────────────────────────────────────── */
  if (isOwner) {
    return (
      <div style={page}>
        <div style={{ ...card, maxWidth: '560px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f2c98f', background: 'rgba(242,201,143,0.1)', border: '1px solid rgba(242,201,143,0.25)', borderRadius: '4px', padding: '0.2rem 0.55rem' }}>
              🎬 Creator View
            </span>
          </div>
          <h1 style={titleStyle}>{slot.title}</h1>
          {slot.description && <p style={descStyle}>{slot.description}</p>}

          {/* ── No mode chosen yet ── */}
          {!effectMode && (
            <>
              <p style={{ fontSize: '0.9rem', color: 'rgba(200,200,215,0.6)', marginBottom: '1.25rem', textAlign: 'center' }}>
                Your event slot is approved. Choose how you want to deliver it:
              </p>

              {modeError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.6rem 0.875rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {modeError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {/* Live option */}
                <button
                  onClick={() => handleChooseMode('live')}
                  disabled={choosingMode}
                  style={modeBtn('#a78bfa', choosingMode)}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📡</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Start Live Event</div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>Broadcast in real-time to your audience</div>
                </button>

                {/* Recorded option */}
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(200,200,215,0.65)', display: 'block', marginBottom: '0.3rem' }}>
                      Video URL (optional — YouTube, Vimeo, or direct link)
                    </label>
                    <input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://..."
                      disabled={choosingMode}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.45rem 0.65rem', fontSize: '0.82rem', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button
                    onClick={() => handleChooseMode('recorded')}
                    disabled={choosingMode}
                    style={modeBtn('#34d399', choosingMode)}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎬</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Upload Recorded Event</div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>Share a pre-recorded video with your audience</div>
                  </button>
                </div>
              </div>

              {streamKey && (
                <div style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '12px', padding: '1rem', fontSize: '0.82rem' }}>
                  <p style={{ fontWeight: 700, marginBottom: '0.3rem', color: '#a78bfa' }}>🔑 Your Stream Key (saved for Live option)</p>
                  <code style={{ wordBreak: 'break-all', color: 'rgba(200,200,215,0.7)', fontSize: '0.75rem' }}>{streamKey}</code>
                </div>
              )}
            </>
          )}

          {/* ── Live mode chosen ── */}
          {effectMode === 'live' && (
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', borderRadius: '999px', background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                📡 Live Event Mode Selected
              </div>

              {streamKey && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.75rem' }}>🔑 Your Stream Key</p>
                  <code style={{ wordBreak: 'break-all', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', color: '#a78bfa', display: 'block' }}>
                    {streamKey}
                  </code>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.4)', marginTop: '0.5rem' }}>
                    Use this key in OBS, Streamlabs, or any RTMP streaming software.
                  </p>
                </div>
              )}

              <div style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '12px', padding: '1rem', fontSize: '0.85rem', color: 'rgba(200,200,215,0.65)' }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Next steps:</p>
                <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li>Open your streaming software (OBS, Streamlabs, etc.)</li>
                  <li>Paste your stream key into the RTMP settings</li>
                  <li>Set the RTMP URL to your Studio Flow stream endpoint</li>
                  <li>Start streaming — your audience will see you go live!</li>
                </ol>
              </div>

              <button
                onClick={() => handleChooseMode('recorded')}
                disabled={choosingMode}
                style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(200,200,215,0.45)', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Switch to Recorded Event instead
              </button>
            </div>
          )}

          {/* ── Recorded mode chosen ── */}
          {effectMode === 'recorded' && (
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', borderRadius: '999px', background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                🎬 Recorded Event Mode Selected
              </div>

              {slotVideo ? (
                <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.5rem' }}>✓ Video Linked</p>
                  <a href={slotVideo} target="_blank" rel="noopener noreferrer" style={{ color: '#34d399', fontSize: '0.82rem', wordBreak: 'break-all' }}>
                    {slotVideo}
                  </a>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                  <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>No video linked yet</p>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="Paste video URL (YouTube, Vimeo, .mp4…)"
                      style={{ flex: 1, minWidth: '200px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.45rem 0.65rem', fontSize: '0.82rem', color: '#fff', outline: 'none' }}
                    />
                    <button
                      onClick={() => handleChooseMode('recorded')}
                      disabled={choosingMode || !videoUrl.trim()}
                      style={{ padding: '0.45rem 1rem', borderRadius: '8px', border: 'none', background: 'rgba(52,211,153,0.2)', color: '#34d399', fontWeight: 700, fontSize: '0.82rem', cursor: choosingMode || !videoUrl.trim() ? 'not-allowed' : 'pointer' }}
                    >
                      {choosingMode ? 'Saving…' : 'Save URL'}
                    </button>
                  </div>
                </div>
              )}

              {modeError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.6rem 0.875rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {modeError}
                </div>
              )}

              <button
                onClick={() => handleChooseMode('live')}
                disabled={choosingMode}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(200,200,215,0.45)', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Switch to Live Event instead
              </button>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/events" style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.8rem', textDecoration: 'none' }}>
              ← Back to Events
            </Link>
            {event?.id && (
              <Link to={`/events/${event.id}`} style={{ color: 'var(--accent-blue)', fontSize: '0.8rem', textDecoration: 'none' }}>
                View Public Event Page →
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── PUBLIC PURCHASE VIEW ─────────────────────────────────── */
  return (
    <div style={page}>
      <div style={card}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
          {effectMode === 'live' ? '📡' : '🎬'}
        </div>
        <h1 style={titleStyle}>{slot.title}</h1>

        {slot.description && <p style={descStyle}>{slot.description}</p>}

        {/* Mode + type badges */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {effectMode && (
            <span style={{
              display: 'inline-block', padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
              background: effectMode === 'live' ? 'rgba(167,139,250,0.12)' : 'rgba(52,211,153,0.12)',
              color: effectMode === 'live' ? '#a78bfa' : '#34d399',
              border: `1px solid ${effectMode === 'live' ? 'rgba(167,139,250,0.3)' : 'rgba(52,211,153,0.3)'}`,
            }}>
              {effectMode === 'live' ? '📡 Live Stream' : '🎬 Pre-Recorded'}
            </span>
          )}
          <span style={{
            display: 'inline-block', padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
            background: isOpen ? 'rgba(34,197,94,0.1)' : 'rgba(245,166,35,0.1)',
            color: isOpen ? '#22c55e' : 'var(--accent-gold, #f5a623)',
            border: `1px solid ${isOpen ? 'rgba(34,197,94,0.3)' : 'rgba(245,166,35,0.3)'}`,
          }}>
            {isOpen ? '🔓 Open Event' : '🔒 Ticketed Event'}
          </span>
        </div>

        {/* Price */}
        {!isOpen && price > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' }}>
            <span style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.85rem' }}>Access Price</span>
            <span style={{ fontWeight: 800, fontSize: '1.75rem', color: 'var(--accent-gold, #f5a623)' }}>
              ${price.toFixed(2)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.4)' }}>98% goes directly to the creator</span>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.6rem 0.875rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'left' }}>
            {error}
          </div>
        )}

        {isOpen ? (
          <p style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            This is a free event. A donation option may be available.
          </p>
        ) : (
          <button onClick={handlePurchase} disabled={buying} style={{
            width: '100%', padding: '0.85rem', borderRadius: '12px',
            background: buying ? 'rgba(245,166,35,0.4)' : 'var(--accent-gold, #f5a623)',
            color: '#000', fontWeight: 800, fontSize: '1rem', border: 'none',
            cursor: buying ? 'not-allowed' : 'pointer',
          }}>
            {buying ? 'Redirecting…' : `Purchase Access — $${price.toFixed(2)}`}
          </button>
        )}

        <p style={{ marginTop: '0.875rem', fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)', textAlign: 'center' }}>
          Payment processed securely via Stripe.
        </p>
      </div>
    </div>
  );
}

/* ── Shared Styles ── */
const page = {
  minHeight: '70vh', display: 'flex', alignItems: 'center',
  justifyContent: 'center', padding: '2rem 1rem',
};

const card = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px', padding: '2.5rem 2rem', maxWidth: '480px', width: '100%', textAlign: 'center',
};

const titleStyle = {
  fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: '0 0 0.75rem',
};

const descStyle = {
  color: 'rgba(200,200,215,0.65)', fontSize: '0.9rem', margin: '0 0 1.25rem', lineHeight: 1.6,
};

const modeBtn = (color, disabled) => ({
  flex: 1, minWidth: '180px', padding: '1.25rem 1rem', borderRadius: '14px',
  border: `1px solid ${color}44`,
  background: `${color}10`,
  color, cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.7 : 1,
  textAlign: 'center', transition: 'all 0.15s',
});
