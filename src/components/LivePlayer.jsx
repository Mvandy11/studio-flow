/**
 * LivePlayer — detects stream platform from URL and renders the correct embed.
 * Supports: YouTube Live, Twitch, Vimeo, Cloudflare Stream, and raw iframes.
 */

function parseEmbedUrl(url) {
  if (!url) return null;

  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');

    // ── YouTube ───────────────────────────────────────────────
    if (host === 'youtube.com' || host === 'youtu.be') {
      let videoId = null;
      if (host === 'youtu.be') {
        videoId = u.pathname.slice(1).split('/')[0];
      } else if (u.pathname.startsWith('/live/')) {
        videoId = u.pathname.replace('/live/', '').split('/')[0];
      } else if (u.pathname.startsWith('/embed/')) {
        return url; // already embed
      } else {
        videoId = u.searchParams.get('v');
      }
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }

    // ── Twitch ─────────────────────────────────────────────────
    if (host === 'twitch.tv') {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        const channel = parts[0];
        const parent = window.location.hostname || 'localhost';
        return `https://player.twitch.tv/?channel=${channel}&parent=${parent}&autoplay=true`;
      }
    }

    // ── Vimeo ──────────────────────────────────────────────────
    if (host === 'vimeo.com') {
      if (u.pathname.startsWith('/event/')) {
        // Vimeo live event — return as-is if it ends in /embed, else append
        return url.includes('/embed') ? url : `${url.replace(/\/$/, '')}/embed`;
      }
      const videoId = u.pathname.split('/').filter(Boolean)[0];
      if (videoId && /^\d+$/.test(videoId)) {
        return `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0`;
      }
    }

    // ── Cloudflare Stream ──────────────────────────────────────
    if (host.includes('cloudflarestream.com') || host.includes('videodelivery.net')) {
      // If URL already ends in /iframe, use as-is
      if (u.pathname.endsWith('/iframe')) return url;
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id) return `https://iframe.videodelivery.net/${id}?autoplay=true`;
    }

    // ── Fallback: use URL directly as iframe src ──────────────
    return url;
  } catch {
    return url; // malformed URL — try rendering as-is
  }
}

export default function LivePlayer({ url, label = 'Live Stream', aspectRatio = '16/9' }) {
  if (!url) return null;

  const embedUrl = parseEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <div style={{
      width: '100%',
      borderRadius: '16px',
      overflow: 'hidden',
      background: '#000',
      marginBottom: '1.75rem',
      border: '1px solid rgba(248,113,113,0.25)',
      boxShadow: '0 0 0 1px rgba(248,113,113,0.1), 0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {/* LIVE badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1rem',
        background: 'rgba(248,113,113,0.08)',
        borderBottom: '1px solid rgba(248,113,113,0.15)',
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.2rem 0.6rem',
          borderRadius: '999px',
          background: '#ef4444',
          color: '#fff',
          fontSize: '0.65rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          animation: 'live-pulse 2s ease-in-out infinite',
        }}>
          🔴 LIVE
        </span>
        <span style={{ fontSize: '0.8rem', color: 'rgba(200,200,215,0.6)', fontWeight: 500 }}>
          {label}
        </span>
      </div>

      {/* Player */}
      <div style={{ position: 'relative', width: '100%', aspectRatio }}>
        <iframe
          src={embedUrl}
          title={label}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
