import { useEffect, useState } from 'react';
import { useParams, Link }    from 'react-router-dom';
import { useAuth }             from '../../hooks/useAuth';
import { supabase }            from '../../lib/supabaseClient';
import LiveChatPanel           from '../../components/live/LiveChatPanel';
import LiveEventViewer         from '../../components/live/LiveEventViewer';

const DONATION_LINK = 'https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t';

function VideoPlayer({ url }) {
  if (!url) return null;

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let src = url;
    if (url.includes('youtu.be/'))
      src = `https://www.youtube.com/embed/${url.split('youtu.be/')[1].split('?')[0]}`;
    else if (url.includes('youtube.com/watch'))
      src = `https://www.youtube.com/embed/${new URL(url).searchParams.get('v')}`;
    return (
      <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: '14px', overflow: 'hidden', background: '#000', marginBottom: '1.75rem' }}>
        <iframe src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Event" />
      </div>
    );
  }

  if (url.includes('vimeo.com')) {
    const id  = url.split('vimeo.com/')[1]?.split('?')[0];
    const src = `https://player.vimeo.com/video/${id}`;
    return (
      <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: '14px', overflow: 'hidden', background: '#000', marginBottom: '1.75rem' }}>
        <iframe src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen title="Event" />
      </div>
    );
  }

  return (
    <video controls src={url} style={{ width: '100%', borderRadius: '14px', background: '#000', marginBottom: '1.75rem', maxHeight: '520px' }} />
  );
}

export default function CreatorEventPage() {
  const { slotId } = useParams();
  const { user }   = useAuth();
  const [event,          setEvent]         = useState(null);
  const [loading,        setLoading]       = useState(true);
  const [error,          setError]         = useState('');
  const [donationTotal,  setDonationTotal] = useState(null);
  const [supporterCount, setSupporterCount] = useState(null);

  useEffect(() => {
    fetch(`/api/creator/events/public/${slotId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else setEvent(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slotId]);

  useEffect(() => {
    if (!slotId) return;
    supabase
      .from('donations')
      .select('amount')
      .eq('event_id', slotId)
      .then(({ data }) => {
        if (data) {
          setDonationTotal(data.reduce((s, d) => s + Number(d.amount), 0));
          setSupporterCount(data.length);
        }
      });
  }, [slotId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="cinematic-spinner" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center', padding: '1rem' }}>
        <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</p>
        <p style={{ color: 'rgba(200,200,215,0.5)' }}>{error || 'Event not found.'}</p>
        <Link to="/events" style={{ color: 'var(--accent-blue, #60a5fa)', fontSize: '0.85rem' }}>← Back to Events</Link>
      </div>
    );
  }

  const creator     = event.profiles;
  const displayName = creator?.display_name || creator?.username || 'Creator';
  const isLive      = event.is_live || event.status === 'live';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <Link to="/events" style={{ fontSize: '0.82rem', color: 'rgba(200,200,215,0.4)', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>
        ← Events
      </Link>

      {/* Thumbnail (non-live events with no video) */}
      {event.thumbnail_url && !event.video_url && !isLive && (
        <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '14px', overflow: 'hidden', background: '#111', marginBottom: '1.75rem' }}>
          <img src={event.thumbnail_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* HLS live player */}
      {isLive && event.hls_url && (
        <div style={{ marginBottom: '1.75rem' }}>
          <LiveEventViewer hlsUrl={event.hls_url} title={event.title} />
        </div>
      )}

      {/* Recorded video player */}
      {!isLive && event.video_url && (
        <VideoPlayer url={event.video_url} />
      )}

      {/* Live — no stream yet */}
      {isLive && !event.hls_url && (
        <div style={{
          width: '100%', aspectRatio: '16/9', borderRadius: '14px', marginBottom: '1.75rem',
          background: 'rgba(239,68,68,0.06)', border: '1px dashed rgba(239,68,68,0.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        }}>
          <span style={{ fontSize: '2.5rem' }}>📡</span>
          <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.9rem', margin: 0 }}>Stream starting soon…</p>
        </div>
      )}

      {/* Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
        {event.category && (
          <span style={badge('#f5a623', 'rgba(245,166,35,0.12)')}>#{event.category}</span>
        )}
        <span style={badge(isLive ? '#ef4444' : '#34d399', isLive ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)')}>
          {isLive ? '🔴 Live' : '🎬 Recorded'}
        </span>
        <span style={badge('#22c55e', 'rgba(34,197,94,0.1)')}>Free</span>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: '1.65rem', fontWeight: 800, lineHeight: 1.2, margin: '0 0 0.75rem' }}>
        {event.title}
      </h1>

      {/* Creator info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
        {creator?.avatar_url ? (
          <img src={creator.avatar_url} alt={displayName} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
            🎬
          </div>
        )}
        <div>
          <Link to={`/profile/${event.creator_id}`} style={{ fontWeight: 700, color: '#fff', textDecoration: 'none', fontSize: '0.92rem' }}>
            {displayName}
          </Link>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(200,200,215,0.4)' }}>
            {new Date(event.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <p style={{ color: 'rgba(200,200,215,0.65)', lineHeight: 1.65, marginBottom: '1.75rem', fontSize: '0.92rem' }}>
          {event.description}
        </p>
      )}

      {/* ── Donation panel ──────────────────────────────────────── */}
      <div style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.22)',
        borderRadius: '14px', marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: '#f5a623', fontSize: '0.95rem' }}>💛 Support This Event</p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(200,200,215,0.45)' }}>
              Help keep this creator going with a one-time donation.
            </p>
          </div>
          <a
            href={`${DONATION_LINK}?client_reference_id=${slotId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.65rem 1.4rem', borderRadius: '10px',
              background: 'rgba(245,166,35,0.18)', border: '1px solid rgba(245,166,35,0.35)',
              color: '#f5a623', fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Donate ❤️
          </a>
        </div>

        {/* Donation totals */}
        {supporterCount !== null && supporterCount > 0 && (
          <div style={{
            display: 'flex', gap: '1.25rem', marginTop: '1rem',
            paddingTop: '0.875rem', borderTop: '1px solid rgba(245,166,35,0.15)',
          }}>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f5a623' }}>
                ${donationTotal.toFixed(2)}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.4)', marginLeft: '0.3rem' }}>raised</span>
            </div>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                {supporterCount}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.4)', marginLeft: '0.3rem' }}>
                {supporterCount === 1 ? 'supporter' : 'supporters'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Reactions placeholder ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {['❤️','🔥','👏','😂','🎬'].map((emoji) => (
          <button
            key={emoji}
            style={{
              padding: '0.4rem 0.85rem', borderRadius: '999px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: '1rem', cursor: 'pointer',
            }}
            onClick={() => {}} // future: increment reaction count
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* ── Live Chat ──────────────────────────────────────────── */}
      {user && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>💬 Chat</h3>
          <LiveChatPanel sessionId={slotId} />
        </div>
      )}

      {!user && (
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 0.75rem', color: 'rgba(200,200,215,0.5)', fontSize: '0.9rem' }}>Sign in to join the chat</p>
          <Link to="/login" className="btn btn--primary" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>Sign In</Link>
        </div>
      )}
    </div>
  );
}

function badge(color, bg) {
  return {
    padding: '0.2rem 0.6rem', borderRadius: '999px',
    fontSize: '0.68rem', fontWeight: 700,
    color, background: bg, border: `1px solid ${color}44`,
  };
}
