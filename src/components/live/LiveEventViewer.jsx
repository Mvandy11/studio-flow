import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

/**
 * LiveEventViewer — HLS video player for live event slots.
 *
 * Flow: OBS → RTMP ingest (rtmp://live.studioflow.tv/live/<key>)
 *           → HLS output  (https://live.studioflow.tv/hls/<key>.m3u8)
 *           → this player
 *
 * Props:
 *   hlsUrl  {string}  — the .m3u8 playlist URL stored in event_slots.hls_url
 *   title   {string}  — shown as the video label (optional)
 */
export default function LiveEventViewer({ hlsUrl, title }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!hlsUrl || !videoRef.current) return;

    let hls;

    if (Hls.isSupported()) {
      hls = new Hls({
        // Start from the live edge, not the beginning of the playlist
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current?.play().catch(() => {});
      });
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari — native HLS support
      videoRef.current.src = hlsUrl;
      videoRef.current.addEventListener('loadedmetadata', () => {
        videoRef.current?.play().catch(() => {});
      });
    }

    return () => {
      hls?.destroy();
    };
  }, [hlsUrl]);

  if (!hlsUrl) return null;

  return (
    <div style={{
      width: '100%',
      background: '#000',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
      position: 'relative',
    }}>
      {/* Live badge */}
      <div style={{
        position: 'absolute', top: '10px', left: '12px', zIndex: 2,
        display: 'flex', alignItems: 'center', gap: '5px',
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        borderRadius: '6px', padding: '3px 8px',
      }}>
        <span style={{
          display: 'inline-block', width: '7px', height: '7px',
          borderRadius: '50%', background: '#ef4444',
          boxShadow: '0 0 5px #ef4444',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
        <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em' }}>
          LIVE
        </span>
      </div>

      <video
        ref={videoRef}
        controls
        muted
        playsInline
        style={{ width: '100%', display: 'block', maxHeight: '420px', objectFit: 'contain' }}
        aria-label={title ? `Live stream: ${title}` : 'Live stream'}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
