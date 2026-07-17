import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const LOAD_TIMEOUT_MS = 5000;

/* ── Relative time ───────────────────────────────────────── */
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return new Date(iso).toLocaleDateString();
}

/* ── Skeleton card ───────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '1.25rem',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ height: 13, width: '40%', borderRadius: 6, background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ height: 10, width: '25%', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
        </div>
      </div>
      <div style={{ height: 200, borderRadius: '10px', background: 'rgba(255,255,255,0.05)', marginBottom: '0.85rem' }} />
      <div style={{ height: 10, width: '80%', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
    </div>
  );
}

/* ── Feed card ───────────────────────────────────────────── */
function FeedCard({ item }) {
  const videoRef   = useRef(null);
  const [copied, setCopied] = useState(false);

  const identity   = item.identities;
  const avatarUrl  = identity?.selfie_url || identity?.image_url;
  const name       = identity?.name ?? 'Studio Flow Creator';
  const scriptText = item.script || item.script_text || '';
  const excerpt    = scriptText.length > 140
    ? scriptText.slice(0, 140) + '...'
    : scriptText;

  function focusVideo() {
    videoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    videoRef.current?.focus();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(item.video_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silently ignore */
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding: '1.1rem 1.1rem 1rem',
      maxWidth: 640,
      width: '100%',
      boxSizing: 'border-box',
    }}>

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.1rem' }}>
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: 'rgba(110,168,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 700, color: 'rgba(110,168,255,0.8)', flexShrink: 0,
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name + date */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'rgba(220,220,235,0.88)', lineHeight: 1.25 }}>
            {name}
          </p>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(200,200,215,0.38)', lineHeight: 1.3 }}>
            {timeAgo(item.created_at)}
          </p>
        </div>

        {/* Badge */}
        <span style={{
          fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.55rem',
          borderRadius: '99px', background: 'rgba(134,239,172,0.13)',
          color: 'rgba(134,239,172,0.75)', border: '1px solid rgba(134,239,172,0.2)',
          flexShrink: 0,
        }}>
          ✅ Completed
        </span>
      </div>

      {/* Video player */}
      <video
        ref={videoRef}
        controls
        src={item.video_url}
        preload="metadata"
        style={{ width: '100%', borderRadius: '8px', marginTop: '12px', display: 'block', background: '#000' }}
      />

      {/* Script preview */}
      {excerpt && (
        <div style={{ marginTop: '0.8rem' }}>
          <p style={{ margin: '0 0 0.2rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(200,200,215,0.32)' }}>
            📝 Script
          </p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(200,200,215,0.5)', lineHeight: 1.55 }}>
            {excerpt}
          </p>
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
        <button
          onClick={focusVideo}
          style={actionBtnStyle}
          onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
          onMouseOut={e  => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
        >
          ▶ Play in Full
        </button>
        <a
          href={item.video_url}
          download
          style={{ ...actionBtnStyle, textDecoration: 'none' }}
          onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
          onMouseOut={e  => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
        >
          Download
        </a>
        <button
          onClick={copyLink}
          style={{ ...actionBtnStyle, color: copied ? 'rgba(134,239,172,0.8)' : undefined }}
          onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
          onMouseOut={e  => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
        >
          {copied ? 'Link copied!' : 'Share'}
        </button>
      </div>
    </div>
  );
}

const actionBtnStyle = {
  padding: '0.4rem 0.85rem',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(200,200,215,0.7)',
  fontSize: '0.8rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'border-color 0.15s',
  display: 'inline-flex',
  alignItems: 'center',
};

/* ── Main Feed page ──────────────────────────────────────── */
export default function Feed() {
  const { loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [feed,    setFeed]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 5-second timeout — guarantees loading is always resolved
    const timer = setTimeout(() => {
      console.warn('[Feed] timeout after 5s');
      setError('Feed is taking too long. Pull to refresh.');
      setLoading(false);
    }, LOAD_TIMEOUT_MS);

    try {
      const { data, error: qErr } = await supabase
        .from('render_jobs')
        .select(`
          id,
          video_url,
          script,
          script_text,
          scenes,
          created_at,
          creator_id,
          identity_id,
          identities (
            name,
            selfie_url,
            image_url
          )
        `)
        .eq('status', 'completed')
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      console.log('Feed data:', data);
      console.log('Feed error:', qErr);

      if (qErr) {
        setError(qErr.message);
      } else {
        setFeed(data ?? []);
      }
    } catch (err) {
      console.error('[Feed] unexpected error:', err);
      setError('Unable to load feed. Please try again.');
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  // Initial load — wait for auth to settle
  useEffect(() => {
    if (authLoading) return;
    loadFeed();
  }, [authLoading, loadFeed]);

  // Realtime — prepend newly completed videos
  useEffect(() => {
    const subscription = supabase
      .channel('feed-realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'render_jobs',
        filter: 'status=eq.completed',
      }, payload => {
        if (payload.new?.video_url) {
          setFeed(prev => {
            if (prev.some(v => v.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        }
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  /* ── Page shell (header always visible) ─────────────────── */
  const header = (
    <div style={{ marginBottom: '1.75rem' }}>
      <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.55rem', fontWeight: 800, color: 'rgba(220,220,235,0.95)' }}>
        🎬 Community Feed
      </h1>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(200,200,215,0.4)' }}>
        Latest videos from Studio Flow creators
      </p>
    </div>
  );

  const wrapper = (children) => (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
      {header}
      {children}
    </div>
  );

  /* ── STATE 1: Loading ────────────────────────────────────── */
  if (authLoading || loading) {
    return wrapper(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  /* ── STATE 2: Error ──────────────────────────────────────── */
  if (error) {
    return wrapper(
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>⚠️</p>
        <p style={{ fontWeight: 600, fontSize: '1rem', color: 'rgba(220,220,235,0.8)', margin: '0 0 0.4rem' }}>
          Couldn't load the feed
        </p>
        <p style={{ fontSize: '0.82rem', color: 'rgba(200,200,215,0.45)', margin: '0 0 1.25rem' }}>{error}</p>
        <button
          onClick={loadFeed}
          style={{ padding: '0.55rem 1.3rem', borderRadius: '9px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(200,200,215,0.8)', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          Try Again
        </button>
      </div>
    );
  }

  /* ── STATE 3: Empty ──────────────────────────────────────── */
  if (feed.length === 0) {
    return wrapper(
      <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
        <p style={{ fontSize: '3rem', margin: '0 0 0.75rem' }}>🎬</p>
        <p style={{ fontWeight: 600, fontSize: '1.05rem', color: 'rgba(220,220,235,0.82)', margin: '0 0 0.5rem' }}>
          Nothing here yet
        </p>
        <p style={{ fontSize: '0.85rem', color: 'rgba(200,200,215,0.45)', margin: '0 auto 1.5rem', maxWidth: 340 }}>
          Be the first to post a video to the Studio Flow community.
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

  /* ── STATE 4: Has content ────────────────────────────────── */
  return wrapper(
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
      {feed.map(item => <FeedCard key={item.id} item={item} />)}
    </div>
  );
}
