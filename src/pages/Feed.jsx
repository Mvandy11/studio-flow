import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const LOAD_TIMEOUT_MS = 5000;

/* ── helpers ─────────────────────────────────────────────── */
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ── Skeleton card ───────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '1.25rem',
      display: 'flex',
      gap: '1rem',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ width: 56, height: 56, borderRadius: '12px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        <div style={{ height: 14, width: '60%', borderRadius: 6, background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ height: 11, width: '85%', borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ height: 11, width: '40%', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
      </div>
    </div>
  );
}

/* ── Feed card types (sessions/events/announcements) ─────── */
const TYPE_CONFIG = {
  session:      { icon: '🎬', label: 'Session',      accent: 'rgba(110,168,255,0.25)',  border: 'rgba(110,168,255,0.15)' },
  event:        { icon: '📅', label: 'Event',        accent: 'rgba(134,239,172,0.18)', border: 'rgba(134,239,172,0.12)' },
  contest:      { icon: '🏆', label: 'Contest',      accent: 'rgba(245,166,35,0.18)',  border: 'rgba(245,166,35,0.12)'  },
  announcement: { icon: '📢', label: 'Announcement', accent: 'rgba(192,132,252,0.18)', border: 'rgba(192,132,252,0.12)' },
};

function FeedCard({ item }) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.session;
  return (
    <Link to={item.href} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          gap: 0,
          transition: 'border-color 0.18s, background 0.18s',
        }}
        onMouseOver={e => { e.currentTarget.style.borderColor = cfg.border; e.currentTarget.style.background = cfg.accent; }}
        onMouseOut={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
      >
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} style={{ width: 96, height: 80, objectFit: 'cover', flexShrink: 0 }} loading="lazy" />
        ) : (
          <div style={{ width: 80, height: 80, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', fontSize: '1.6rem' }}>
            {cfg.icon}
          </div>
        )}
        <div style={{ flex: 1, padding: '0.85rem 1rem', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', padding: '0.15rem 0.5rem', borderRadius: '99px', background: cfg.accent, color: 'rgba(220,220,235,0.7)', border: `1px solid ${cfg.border}` }}>
              {cfg.icon} {cfg.label}
            </span>
            {item.badge && (
              <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '99px', background: 'rgba(245,166,35,0.15)', color: '#f5a623', border: '1px solid rgba(245,166,35,0.25)' }}>
                {item.badge}
              </span>
            )}
            <span style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.35)', marginLeft: 'auto' }}>{timeAgo(item.created_at)}</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'rgba(220,220,235,0.9)', lineHeight: 1.35 }}>{item.title}</p>
          {item.subtitle && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgba(200,200,215,0.45)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {item.subtitle}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Video feed card (render_jobs) ───────────────────────── */
function VideoFeedCard({ job }) {
  const videoUrl    = Array.isArray(job.video_url) ? job.video_url[0] : job.video_url;
  const identity    = job.identities;
  const avatarUrl   = identity?.selfie_url || identity?.image_url;
  const creatorName = identity?.name ?? 'Unknown Creator';
  const scriptText  = job.script || job.script_text || '';
  const excerpt     = scriptText ? scriptText.slice(0, 100) + (scriptText.length > 100 ? '…' : '') : null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      overflow: 'hidden',
      transition: 'border-color 0.18s, transform 0.15s',
    }}
      onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(110,168,255,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseOut={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {videoUrl && (
        <video
          src={videoUrl}
          controls
          style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'cover', background: '#000' }}
        />
      )}
      <div style={{ padding: '0.85rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={creatorName} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(110,168,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>🎭</div>
          )}
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'rgba(220,220,235,0.85)' }}>{creatorName}</span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.35)', marginLeft: 'auto' }}>{timeAgo(job.created_at)}</span>
        </div>
        {excerpt && (
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(200,200,215,0.5)', lineHeight: 1.5 }}>
            "{excerpt}"
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Section header ──────────────────────────────────────── */
function SectionHeader({ icon, title, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '2rem 0 0.75rem' }}>
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(200,200,215,0.55)' }}>
        {title}
      </h2>
      {count > 0 && (
        <span style={{ fontSize: '0.7rem', color: 'rgba(200,200,215,0.3)', marginLeft: '0.25rem' }}>({count})</span>
      )}
    </div>
  );
}

/* ── Main Feed page ──────────────────────────────────────── */
export default function Feed() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [sessions,      setSessions]      = useState([]);
  const [events,        setEvents]        = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [videos,        setVideos]        = useState([]);
  const [feedLoading,   setFeedLoading]   = useState(true);
  const [feedError,     setFeedError]     = useState(null);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);

    // 5-second timeout guard — always resolves loading state
    const timer = setTimeout(() => {
      console.error('[Feed] load timeout after 5s');
      setFeedError('Feed took too long to load. Please refresh.');
      setFeedLoading(false);
    }, LOAD_TIMEOUT_MS);

    try {
      const results = await Promise.allSettled([
        supabase
          .from('sessions')
          .select('id, title, description, thumbnail_url, created_at, creator_id')
          .order('created_at', { ascending: false })
          .limit(20),

        supabase
          .from('events')
          .select('id, title, description, thumbnail_url, created_at, creator_id, is_paid_event, ticket_price, status')
          .order('created_at', { ascending: false })
          .limit(20),

        supabase
          .from('announcements')
          .select('id, title, body, created_at')
          .order('created_at', { ascending: false })
          .limit(10),

        supabase
          .from('render_jobs')
          .select(`id, video_url, script, script_text, created_at, status, identity_id, identities (name, selfie_url, image_url)`)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      clearTimeout(timer);

      const [sessRes, evRes, annRes, vidRes] = results;

      if (sessRes.status === 'fulfilled') {
        if (sessRes.value.error) console.error('[Feed] sessions error:', sessRes.value.error);
        setSessions(sessRes.value.data ?? []);
      }

      if (evRes.status === 'fulfilled') {
        if (evRes.value.error) console.error('[Feed] events error:', evRes.value.error);
        setEvents(evRes.value.data ?? []);
      }

      if (annRes.status === 'fulfilled') {
        if (annRes.value.error) console.error('[Feed] announcements error:', annRes.value.error);
        setAnnouncements(annRes.value.data ?? []);
      }

      // render_jobs — log result for debugging
      if (vidRes.status === 'fulfilled') {
        console.log('Feed — data:', vidRes.value.data);
        console.log('Feed — error:', vidRes.value.error);
        setVideos(vidRes.value.data ?? []);
      } else {
        console.error('[Feed] render_jobs rejected:', vidRes.reason);
      }
    } catch (err) {
      clearTimeout(timer);
      console.error('[Feed] unexpected error:', err);
      setFeedError('Unable to load feed. Please refresh.');
    } finally {
      clearTimeout(timer);
      setFeedLoading(false);
    }
  }, []);

  // Load on mount — wait for auth to settle first
  useEffect(() => {
    if (authLoading) return;
    loadFeed();
  }, [authLoading, loadFeed]);

  // Realtime — prepend newly completed videos to the top
  useEffect(() => {
    const channel = supabase
      .channel('feed_completed_videos')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'render_jobs',
        filter: 'status=eq.completed',
      }, async payload => {
        const jobId = payload.new?.id;
        if (!jobId) return;

        // Fetch full row with identity join
        const { data } = await supabase
          .from('render_jobs')
          .select('id, video_url, script, created_at, status, identity_id, identities(name, selfie_url, image_url)')
          .eq('id', jobId)
          .single();

        if (data) {
          setVideos(prev => {
            // Avoid duplicates
            if (prev.some(v => v.id === data.id)) return prev;
            return [data, ...prev];
          });
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  /* ── Loading ─────────────────────────────────────────── */
  if (authLoading || feedLoading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ height: 28, width: 160, borderRadius: 8, background: 'rgba(255,255,255,0.06)', marginBottom: '0.5rem' }} />
          <div style={{ height: 14, width: 240, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────── */
  if (feedError) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</p>
        <p style={{ color: 'rgba(200,200,215,0.55)', marginBottom: '1.25rem' }}>
          Couldn't load the feed. Please refresh and try again.
        </p>
        <button
          onClick={loadFeed}
          style={{ padding: '0.55rem 1.25rem', borderRadius: '9px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(200,200,215,0.75)', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── Map to unified card shape ───────────────────────── */
  const sessionCards = sessions.map(s => ({
    id: `session-${s.id}`, type: 'session',
    title: s.title || 'Untitled Session', subtitle: s.description,
    thumbnail: s.thumbnail_url, href: `/session/${s.id}`, created_at: s.created_at,
  }));

  const eventCards = events.map(ev => ({
    id: `event-${ev.id}`, type: 'event',
    title: ev.title || 'Upcoming Event', subtitle: ev.description,
    thumbnail: ev.thumbnail_url, href: `/events/${ev.id}`, created_at: ev.created_at,
    badge: ev.is_paid_event ? `$${ev.ticket_price} ticket` : 'Free',
  }));

  const announcementCards = announcements.map(a => ({
    id: `ann-${a.id}`, type: 'announcement',
    title: a.title || 'Announcement', subtitle: a.body,
    thumbnail: null, href: '/announcements', created_at: a.created_at,
  }));

  const allItems = [...sessionCards, ...eventCards]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 30);

  const totalItems = allItems.length + videos.length;

  /* ── Empty state (nothing anywhere) ─────────────────── */
  if (totalItems === 0 && announcementCards.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎬</p>
        <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'rgba(220,220,235,0.8)', margin: '0 0 0.5rem' }}>Nothing here yet</p>
        <p style={{ color: 'rgba(200,200,215,0.45)', marginBottom: '1.5rem', maxWidth: 360, margin: '0 auto 1.5rem' }}>
          Be the first to share a video with the Studio Flow community.
        </p>
        <button
          onClick={() => navigate('/generator')}
          style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', background: '#3b82f6', border: 'none', color: '#fff', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Generate a Video →
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* Page header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.6rem', fontWeight: 800, color: 'rgba(220,220,235,0.95)' }}>
          Studio Flow Feed
        </h1>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(200,200,215,0.4)' }}>
          Videos, contests &amp; announcements — all in one place.
          {!user && (
            <> <Link to="/login" style={{ color: 'rgba(110,168,255,0.8)', textDecoration: 'none' }}>Log in</Link> to see personalized content.</>
          )}
        </p>
      </div>

      {/* Announcements pinned at top */}
      {announcementCards.length > 0 && (
        <>
          <SectionHeader icon="📢" title="Announcements" count={announcementCards.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.5rem' }}>
            {announcementCards.slice(0, 3).map(item => <FeedCard key={item.id} item={item} />)}
          </div>
        </>
      )}

      {/* Avatar videos from render_jobs */}
      {videos.length > 0 && (
        <>
          <SectionHeader icon="🎬" title="Community Videos" count={videos.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {videos.map(job => <VideoFeedCard key={job.id} job={job} />)}
          </div>
        </>
      )}

      {/* Sessions & events stream */}
      {allItems.length > 0 && (
        <>
          <SectionHeader icon="⚡" title="Latest" count={allItems.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {allItems.map(item => <FeedCard key={item.id} item={item} />)}
          </div>
        </>
      )}

      {/* Empty video section nudge */}
      {videos.length === 0 && allItems.length > 0 && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '14px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 0.75rem', color: 'rgba(200,200,215,0.6)', fontSize: '0.88rem' }}>
            🎬 No community videos yet — be the first!
          </p>
          <button
            onClick={() => navigate('/generator')}
            style={{ padding: '0.5rem 1.1rem', borderRadius: '8px', background: '#3b82f6', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Generate a Video →
          </button>
        </div>
      )}

      {/* Explore links */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {[{ to: '/contests', label: '🏆 All Contests' }, { to: '/tools', label: '🛠 AI Tools' }].map(({ to, label }) => (
          <Link key={to} to={to} style={{ padding: '0.45rem 0.9rem', borderRadius: '9px', textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(200,200,215,0.65)', fontSize: '0.83rem', fontWeight: 500, transition: 'border-color 0.15s, background 0.15s' }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(110,168,255,0.3)'; e.currentTarget.style.background = 'rgba(110,168,255,0.07)'; }}
            onMouseOut={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
