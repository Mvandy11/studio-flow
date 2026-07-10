import { useEffect, useState, useCallback } from 'react';
import { useParams, Link }  from 'react-router-dom';
import { useAuth }          from '../../hooks/useAuth';
import { useMembership }    from '../../modules/memberships';
import { isCreatorAdmin }   from '../../lib/roles';
import { supabase }         from '../../lib/supabase';
import LiveChatPanel        from '../../components/live/LiveChatPanel';
import LiveEventViewer      from '../../components/live/LiveEventViewer';

const DONATION_LINK = 'https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t';

const REACTIONS = [
  { emoji: '❤️', label: 'Love' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '😂', label: 'Funny' },
  { emoji: '🎬', label: 'Cinematic' },
];

/* ── Video player — handles YouTube, Vimeo, direct MP4 ── */
function VideoPlayer({ url }) {
  if (!url) return null;

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let src = url;
    try {
      if (url.includes('youtu.be/'))
        src = `https://www.youtube.com/embed/${url.split('youtu.be/')[1].split('?')[0]}`;
      else if (url.includes('watch'))
        src = `https://www.youtube.com/embed/${new URL(url).searchParams.get('v')}`;
    } catch (_) {}
    return (
      <div style={ratio16x9}>
        <iframe src={src} style={absoluteFill} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Event Video" />
      </div>
    );
  }

  if (url.includes('vimeo.com')) {
    const id  = url.split('vimeo.com/')[1]?.split('?')[0];
    const src = `https://player.vimeo.com/video/${id}`;
    return (
      <div style={ratio16x9}>
        <iframe src={src} style={absoluteFill} allowFullScreen title="Event Video" />
      </div>
    );
  }

  return (
    <video controls src={url} style={{ width: '100%', borderRadius: '16px', background: '#000', display: 'block', maxHeight: '540px' }} />
  );
}

/* ── Locked overlay for free users ── */
function LockedOverlay({ thumbnail }) {
  return (
    <div style={{ ...ratio16x9, marginBottom: 0 }}>
      {thumbnail && (
        <img src={thumbnail} alt="Event thumbnail" style={{ ...absoluteFill, objectFit: 'cover', filter: 'blur(6px) brightness(0.35)' }} />
      )}
      <div style={{ ...absoluteFill, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1.5rem', textAlign: 'center', position: 'absolute', inset: 0 }}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <div>
          <p style={{ fontWeight: 800, fontSize: '1.1rem', margin: '0 0 0.35rem' }}>Members Only</p>
          <p style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.875rem', margin: '0 0 1.25rem', maxWidth: '340px' }}>
            Upgrade to a membership to watch this event in full.
          </p>
          <Link to="/membership" className="btn btn--primary" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>
            Upgrade to Watch →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CreatorEventPage() {
  const { slotId }         = useParams();
  const { user, role }     = useAuth();
  const { tier }           = useMembership();

  const isAdmin     = isCreatorAdmin(role);
  const isCreator50 = tier === 'creator_50' || isAdmin;
  const isMember30  = tier === 'member_30';
  const canWatch    = isMember30 || isCreator50;

  const [event,          setEvent]         = useState(null);
  const [loading,        setLoading]       = useState(true);
  const [error,          setError]         = useState('');
  const [donationTotal,  setDonationTotal] = useState(null);
  const [supporterCount, setSupporterCount]= useState(null);
  const [reactions,      setReactions]     = useState(() => {
    try { return JSON.parse(localStorage.getItem(`rxn-${slotId}`) || '{}'); }
    catch (_) { return {}; }
  });

  /* ── Fetch event ── */
  useEffect(() => {
    setLoading(true);
    fetch(`/api/creator/events/public/${slotId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else setEvent(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slotId]);

  /* ── Fetch donation stats ── */
  useEffect(() => {
    if (!slotId) return;
    supabase
      .from('donations')
      .select('amount')
      .eq('event_id', slotId)
      .then(({ data }) => {
        if (data?.length) {
          setDonationTotal(data.reduce((s, d) => s + Number(d.amount), 0));
          setSupporterCount(data.length);
        }
      });
  }, [slotId]);

  /* ── Reactions (optimistic, persisted in localStorage) ── */
  const handleReaction = useCallback((emoji) => {
    setReactions((prev) => {
      const updated = { ...prev, [emoji]: (prev[emoji] || 0) + (prev[emoji] ? -1 : 1) };
      if (updated[emoji] <= 0) delete updated[emoji];
      try { localStorage.setItem(`rxn-${slotId}`, JSON.stringify(updated)); } catch (_) {}
      return updated;
    });
  }, [slotId]);

  /* ── Loading / Error ── */
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '55vh' }}>
        <div className="cinematic-spinner" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center', padding: '1rem' }}>
        <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</p>
        <p style={{ color: 'rgba(200,200,215,0.5)', marginBottom: '1rem' }}>{error || 'Event not found.'}</p>
        <Link to="/events" style={{ color: '#a78bfa', fontSize: '0.875rem', textDecoration: 'none' }}>← Back to Events</Link>
      </div>
    );
  }

  const creator     = event.profiles;
  const displayName = creator?.display_name || creator?.username || 'Creator';
  const isLive      = event.is_live || event.status === 'live';
  const isOwner     = user?.id && event.creator_id === user.id;
  const canEdit     = isOwner || isAdmin;

  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'rgba(200,200,215,0.4)', display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link to="/events" style={{ color: 'rgba(200,200,215,0.4)', textDecoration: 'none' }}>Events</Link>
        {event.category && (
          <>
            <span>›</span>
            <Link to={`/events/${encodeURIComponent(event.category)}`} style={{ color: 'rgba(200,200,215,0.4)', textDecoration: 'none' }}>
              {event.category}
            </Link>
          </>
        )}
        <span>›</span>
        <span style={{ color: 'rgba(200,200,215,0.75)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</span>
      </div>

      {/* ── Media section ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Free users — locked overlay */}
        {!canWatch && (event.video_url || isLive) && (
          <LockedOverlay thumbnail={event.thumbnail_url} />
        )}

        {/* HLS live player (members+) */}
        {canWatch && isLive && event.hls_url && (
          <LiveEventViewer hlsUrl={event.hls_url} title={event.title} />
        )}

        {/* Live — waiting for stream */}
        {isLive && !event.hls_url && (
          <div style={{ ...ratio16x9, background: 'rgba(239,68,68,0.06)', border: 'none' }}>
            <div style={{ ...absoluteFill, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'absolute', inset: 0 }}>
              <span style={{ fontSize: '2.5rem' }}>📡</span>
              <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.9rem', margin: 0 }}>Stream starting soon…</p>
            </div>
          </div>
        )}

        {/* Recorded video (members+) */}
        {canWatch && !isLive && event.video_url && (
          <VideoPlayer url={event.video_url} />
        )}

        {/* Thumbnail only (no video, or free user without video) */}
        {(!event.video_url && !isLive) && event.thumbnail_url && (
          <div style={{ position: 'relative' }}>
            <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#111' }}>
              <img src={event.thumbnail_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {/* Members see a "video not yet available" overlay when they have access but no video */}
            {canWatch && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'rgba(200,200,215,0.6)' }}>
                <span>⏳</span>
                <span>The creator hasn't uploaded video yet — check back soon.</span>
              </div>
            )}
          </div>
        )}

        {/* Placeholder when no thumbnail and no video */}
        {!event.thumbnail_url && !event.video_url && !isLive && (
          <div style={{ ...ratio16x9, background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
            <div style={{ ...absoluteFill, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'absolute', inset: 0 }}>
              <span style={{ fontSize: '4rem' }}>🎬</span>
              {canWatch && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(200,200,215,0.4)' }}>
                  Video not yet available — check back soon.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Title row ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
            {event.category && (
              <Link to={`/events/${encodeURIComponent(event.category)}`} style={{ textDecoration: 'none' }}>
                <span style={pill('#f5a623', 'rgba(245,166,35,0.12)')} title={`Browse ${event.category}`}>#{event.category}</span>
              </Link>
            )}
            <span style={pill(isLive ? '#ef4444' : '#34d399', isLive ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)')}>
              {isLive ? '🔴 Live Now' : '🎬 Recorded'}
            </span>
            <span style={pill('#22c55e', 'rgba(34,197,94,0.1)')}>Free Entry</span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)', fontWeight: 800, lineHeight: 1.2, margin: '0 0 0.5rem' }}>
            {event.title}
          </h1>

          {/* Creator row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {creator?.avatar_url ? (
              <img src={creator.avatar_url} alt={displayName} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>🎬</div>
            )}
            <Link to={`/profile/${event.creator_id}`} style={{ fontWeight: 700, color: 'rgba(200,200,215,0.8)', textDecoration: 'none', fontSize: '0.88rem' }}>
              {displayName}
            </Link>
            <span style={{ color: 'rgba(200,200,215,0.3)', fontSize: '0.72rem' }}>·</span>
            <span style={{ color: 'rgba(200,200,215,0.35)', fontSize: '0.72rem' }}>
              {new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Edit button for owner / admin */}
        {canEdit && (
          <Link
            to="/creator/events"
            className="btn"
            style={{ textDecoration: 'none', flexShrink: 0, fontSize: '0.82rem' }}
          >
            ✏️ Manage Events
          </Link>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <p style={{ color: 'rgba(200,200,215,0.6)', lineHeight: 1.7, margin: '1rem 0 1.5rem', fontSize: '0.92rem' }}>
          {event.description}
        </p>
      )}

      {/* ── Upgrade CTA (free users, event has watchable content) ── */}
      {!canWatch && (event.video_url || isLive) && (
        <div style={upgradeBanner}>
          <div>
            <p style={{ fontWeight: 700, margin: '0 0 0.25rem', fontSize: '0.95rem' }}>🌟 Become a Member to Watch</p>
            <p style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.825rem', margin: 0 }}>
              Members get full access to every event — live and recorded.
            </p>
          </div>
          <Link to="/membership" className="btn btn--primary" style={{ textDecoration: 'none', flexShrink: 0, fontSize: '0.875rem' }}>
            Upgrade — $40/mo →
          </Link>
        </div>
      )}

      {/* ── Donation panel ─────────────────────────────────────────── */}
      <div style={donationPanel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: '#f5a623', fontSize: '0.95rem' }}>💛 Support This Event</p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(200,200,215,0.45)' }}>
              Help keep this creator going with a one-time donation.
            </p>
          </div>
          <a
            href={`${DONATION_LINK}?client_reference_id=${slotId}&success_url=${encodeURIComponent(`/donate/success?event_id=${slotId}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={donateBtn}
          >
            Donate ❤️
          </a>
        </div>

        {supporterCount !== null && supporterCount > 0 && (
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', paddingTop: '0.875rem', borderTop: '1px solid rgba(245,166,35,0.15)' }}>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f5a623' }}>${donationTotal.toFixed(2)}</span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.4)', marginLeft: '0.3rem' }}>raised</span>
            </div>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{supporterCount}</span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.4)', marginLeft: '0.3rem' }}>
                {supporterCount === 1 ? 'supporter' : 'supporters'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Reactions ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(200,200,215,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.6rem' }}>
          React
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {REACTIONS.map(({ emoji, label }) => {
            const active = reactions[emoji] > 0;
            return (
              <button
                key={emoji}
                onClick={() => user ? handleReaction(emoji) : null}
                title={user ? label : 'Sign in to react'}
                style={{
                  padding: '0.4rem 0.9rem', borderRadius: '999px',
                  background: active ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  color: '#fff', fontSize: '1rem', cursor: user ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  transition: 'all 0.15s',
                }}
              >
                {emoji}
                {active && <span style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 700 }}>{reactions[emoji]}</span>}
              </button>
            );
          })}
          {!user && (
            <span style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.3)', alignSelf: 'center', marginLeft: '0.25rem' }}>
              <Link to="/login" style={{ color: '#a78bfa', textDecoration: 'none' }}>Sign in</Link> to react
            </span>
          )}
        </div>
      </div>

      {/* ── Chat ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          💬 Chat
          {isLive && <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>LIVE</span>}
        </h3>

        {user ? (
          <LiveChatPanel sessionId={slotId} user={user} />
        ) : (
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.75rem', color: 'rgba(200,200,215,0.5)', fontSize: '0.875rem' }}>Sign in to join the conversation</p>
            <Link to="/login" className="btn btn--primary" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>Sign In</Link>
          </div>
        )}
      </div>

      {/* Back link */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Link to={event.category ? `/events/${encodeURIComponent(event.category)}` : '/events'} style={{ fontSize: '0.82rem', color: 'rgba(200,200,215,0.35)', textDecoration: 'none' }}>
          ← Back to {event.category || 'Events'}
        </Link>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */
const ratio16x9 = {
  position: 'relative', paddingTop: '56.25%',
  background: '#111', overflow: 'hidden', borderRadius: '0',
};

const absoluteFill = {
  position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none',
};

function pill(color, bg) {
  return {
    display: 'inline-block',
    padding: '0.2rem 0.6rem', borderRadius: '999px',
    fontSize: '0.68rem', fontWeight: 700,
    color, background: bg, border: `1px solid ${color}44`,
    cursor: 'pointer',
  };
}

const donationPanel = {
  padding: '1.25rem 1.5rem',
  background: 'rgba(245,166,35,0.06)',
  border: '1px solid rgba(245,166,35,0.2)',
  borderRadius: '14px', marginBottom: '1.75rem',
};

const donateBtn = {
  padding: '0.65rem 1.4rem', borderRadius: '10px',
  background: 'rgba(245,166,35,0.16)', border: '1px solid rgba(245,166,35,0.35)',
  color: '#f5a623', fontWeight: 800, fontSize: '0.9rem',
  textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block',
};

const upgradeBanner = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: '1rem', flexWrap: 'wrap',
  background: 'linear-gradient(135deg, rgba(167,139,250,0.07), rgba(245,166,35,0.07))',
  border: '1px solid rgba(167,139,250,0.2)',
  borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.75rem',
};
