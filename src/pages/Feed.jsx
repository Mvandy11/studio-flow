import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

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

/* ── Feed card types ─────────────────────────────────────── */
const TYPE_CONFIG = {
  session:     { icon: '🎬', label: 'Session',     accent: 'rgba(110,168,255,0.25)',  border: 'rgba(110,168,255,0.15)' },
  event:       { icon: '📅', label: 'Event',       accent: 'rgba(134,239,172,0.18)', border: 'rgba(134,239,172,0.12)' },
  contest:     { icon: '🏆', label: 'Contest',     accent: 'rgba(245,166,35,0.18)',  border: 'rgba(245,166,35,0.12)'  },
  announcement:{ icon: '📢', label: 'Announcement',accent: 'rgba(192,132,252,0.18)', border: 'rgba(192,132,252,0.12)' },
};

function FeedCard({ item }) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.session;

  return (
    <Link
      to={item.href}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid rgba(255,255,255,0.07)`,
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        gap: 0,
        transition: 'border-color 0.18s, background 0.18s',
      }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = cfg.border;
          e.currentTarget.style.background  = cfg.accent;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
          e.currentTarget.style.background  = 'rgba(255,255,255,0.025)';
        }}
      >
        {/* Thumbnail */}
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            style={{ width: 96, height: 80, objectFit: 'cover', flexShrink: 0 }}
            loading="lazy"
          />
        ) : (
          <div style={{
            width: 80, height: 80, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)',
            fontSize: '1.6rem',
          }}>
            {cfg.icon}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, padding: '0.85rem 1rem', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em',
              padding: '0.15rem 0.5rem', borderRadius: '99px',
              background: cfg.accent, color: 'rgba(220,220,235,0.7)',
              border: `1px solid ${cfg.border}`,
            }}>
              {cfg.icon} {cfg.label}
            </span>
            {item.badge && (
              <span style={{
                fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                borderRadius: '99px', background: 'rgba(245,166,35,0.15)',
                color: '#f5a623', border: '1px solid rgba(245,166,35,0.25)',
              }}>
                {item.badge}
              </span>
            )}
            <span style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.35)', marginLeft: 'auto' }}>
              {timeAgo(item.created_at)}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'rgba(220,220,235,0.9)', lineHeight: 1.35 }}>
            {item.title}
          </p>

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

  const [sessions,      setSessions]      = useState([]);
  const [events,        setEvents]        = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [feedLoading,   setFeedLoading]   = useState(true);
  const [feedError,     setFeedError]     = useState(null);

  useEffect(() => {
    if (authLoading) return;

    async function loadFeed() {
      setFeedLoading(true);
      setFeedError(null);

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
        ]);

        const [sessRes, evRes, annRes] = results;

        setSessions(
          sessRes.status === 'fulfilled' ? (sessRes.value.data ?? []) : []
        );
        setEvents(
          evRes.status === 'fulfilled' ? (evRes.value.data ?? []) : []
        );
        setAnnouncements(
          annRes.status === 'fulfilled' ? (annRes.value.data ?? []) : []
        );
      } catch (err) {
        setFeedError('Unable to load feed. Please refresh.');
      } finally {
        setFeedLoading(false);
      }
    }

    loadFeed();
  }, [authLoading]);

  /* ── Loading ─────────────────────────────────────────── */
  if (authLoading || feedLoading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ height: 28, width: 160, borderRadius: 8, background: 'rgba(255,255,255,0.06)', marginBottom: '0.5rem' }} />
          <div style={{ height: 14, width: 240, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3,4].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────── */
  if (feedError) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠</p>
        <p style={{ color: 'rgba(200,200,215,0.55)', marginBottom: '1.25rem' }}>{feedError}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.55rem 1.25rem', borderRadius: '9px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(200,200,215,0.75)', cursor: 'pointer', fontSize: '0.875rem',
          }}
        >
          Refresh
        </button>
      </div>
    );
  }

  /* ── Map to unified card shape ───────────────────────── */
  const sessionCards = sessions.map((s) => ({
    id:         `session-${s.id}`,
    type:       'session',
    title:      s.title || 'Untitled Session',
    subtitle:   s.description,
    thumbnail:  s.thumbnail_url,
    href:       `/session/${s.id}`,
    created_at: s.created_at,
  }));

  const eventCards = events.map((ev) => ({
    id:         `event-${ev.id}`,
    type:       'event',
    title:      ev.title || 'Upcoming Event',
    subtitle:   ev.description,
    thumbnail:  ev.thumbnail_url,
    href:       `/events/${ev.id}`,
    created_at: ev.created_at,
    badge:      ev.is_paid_event ? `$${ev.ticket_price} ticket` : 'Free',
  }));

  const announcementCards = announcements.map((a) => ({
    id:         `ann-${a.id}`,
    type:       'announcement',
    title:      a.title || 'Announcement',
    subtitle:   a.body,
    thumbnail:  null,
    href:       '/announcements',
    created_at: a.created_at,
  }));

  /* ── Unified "Latest" stream — sessions & events only, no contests or announcements ── */
  const allItems = [...sessionCards, ...eventCards]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 30);

  const isEmpty = allItems.length === 0;

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
            {announcementCards.slice(0, 3).map((item) => <FeedCard key={item.id} item={item} />)}
          </div>
        </>
      )}

      {/* Latest combined stream */}
      {isEmpty ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</p>
          <p style={{ color: 'rgba(200,200,215,0.5)', fontSize: '1rem', marginBottom: '0.5rem' }}>
            No posts yet — creators will appear here soon.
          </p>
          <p style={{ color: 'rgba(200,200,215,0.3)', fontSize: '0.82rem' }}>
            Check back later or explore <Link to="/contests" style={{ color: 'rgba(110,168,255,0.7)', textDecoration: 'none' }}>contests</Link>.
          </p>
        </div>
      ) : (
        <>
          <SectionHeader icon="⚡" title="Latest" count={allItems.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {allItems.map((item) => <FeedCard key={item.id} item={item} />)}
          </div>
        </>
      )}

      {/* Explore links at bottom */}
      {!isEmpty && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.6rem',
          marginTop: '2.5rem', paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {[
            { to: '/events',   label: '📅 All Events'   },
            { to: '/contests', label: '🏆 All Contests'  },
            { to: '/creator-academy', label: '🎓 Academy' },
            { to: '/tools',    label: '🛠 AI Tools'      },
          ].map(({ to, label }) => (
            <Link
              key={to} to={to}
              style={{
                padding: '0.45rem 0.9rem', borderRadius: '9px', textDecoration: 'none',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(200,200,215,0.65)', fontSize: '0.83rem', fontWeight: 500,
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'rgba(110,168,255,0.3)';
                e.currentTarget.style.background  = 'rgba(110,168,255,0.07)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.background  = 'rgba(255,255,255,0.04)';
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
