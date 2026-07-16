import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import './myVideos.css';

const LOAD_TIMEOUT_MS = 5000;

// ─── helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function StatusBadge({ status }) {
  const map = {
    completed:  { label: '✅ Completed',  cls: 'mv-badge--green' },
    pending:    { label: '🔄 Processing', cls: 'mv-badge--yellow' },
    processing: { label: '🔄 Processing', cls: 'mv-badge--yellow' },
    failed:     { label: '❌ Failed',     cls: 'mv-badge--red' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: '' };
  return <span className={`mv-badge ${cls}`}>{label}</span>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="mv-card mv-card--skeleton">
      <div className="mv-skeleton mv-skeleton--video" />
      <div className="mv-card__body">
        <div className="mv-skeleton mv-skeleton--title" />
        <div className="mv-skeleton mv-skeleton--badge" />
      </div>
    </div>
  );
}

// ─── Single video card ────────────────────────────────────────────────────────
function VideoCard({ job, identityMap, highlighted }) {
  const navigate = useNavigate();
  const [localJob, setLocalJob] = useState(job);

  // Subscribe to realtime for pending/processing jobs
  useEffect(() => {
    if (localJob.status !== 'pending' && localJob.status !== 'processing') return;

    const channel = supabase
      .channel(`mv_job_${localJob.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'render_jobs',
        filter: `id=eq.${localJob.id}`,
      }, payload => {
        setLocalJob(prev => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [localJob.id, localJob.status]);

  const { status, video_url, error_message, identity_id, created_at } = localJob;
  const identityName = identityMap[identity_id] ?? 'Unknown identity';
  const videoUrl = Array.isArray(video_url) ? video_url[0] : video_url;

  function copyLink() {
    if (videoUrl) navigator.clipboard.writeText(videoUrl).catch(() => {});
  }

  return (
    <div className={`mv-card${highlighted ? ' mv-card--highlighted' : ''}`}>

      {/* Video / placeholder area */}
      {status === 'completed' && videoUrl ? (
        <video
          className="mv-card__video"
          src={videoUrl}
          controls
          poster={identityMap[`img_${identity_id}`] ?? undefined}
        />
      ) : status === 'failed' ? (
        <div className="mv-card__placeholder mv-card__placeholder--failed">
          <span className="mv-placeholder-icon">❌</span>
        </div>
      ) : (
        <div className="mv-card__placeholder mv-card__placeholder--processing">
          <span className="mv-placeholder-icon mv-pulse">⏳</span>
          <p className="mv-processing-label">Generating…</p>
        </div>
      )}

      <div className="mv-card__body">
        <p className="mv-card__identity">{identityName}</p>
        <p className="mv-card__date">{formatDate(created_at)}</p>
        <StatusBadge status={status} />

        {status === 'failed' && error_message && (
          <p className="mv-card__error">{error_message}</p>
        )}

        {status === 'completed' && videoUrl && (
          <div className="mv-card__actions">
            <a className="mv-btn mv-btn--sm" href={videoUrl} download>
              Download
            </a>
            <button className="mv-btn mv-btn--sm" onClick={copyLink}>
              Share
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="mv-card__actions">
            <button className="mv-btn mv-btn--sm mv-btn--primary" onClick={() => navigate('/generator')}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="mv-toast" onClick={onDismiss}>
      {message}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MyVideos() {
  const { user, loading: authLoading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [jobs, setJobs]           = useState([]);
  const [identityMap, setIdentityMap] = useState({});
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [toast, setToast]         = useState(null);
  const [highlightedJob, setHighlightedJob] = useState(null);
  const highlightRef = useRef(null);

  // Parse ?job= query param
  const jobParam = new URLSearchParams(location.search).get('job');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setFetchError(false);

    // 5-second timeout guard
    const timer = setTimeout(() => {
      setFetchError(true);
      setLoading(false);
    }, LOAD_TIMEOUT_MS);

    try {
      const { data, error } = await supabase
        .from('render_jobs')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      clearTimeout(timer);

      if (error) {
        console.error('[MyVideos] render_jobs query error:', error);
        setFetchError(true);
        setLoading(false);
        return;
      }

      const rows = data || [];
      setJobs(rows);

      // Fetch identity names in bulk
      const ids = [...new Set(rows.map(r => r.identity_id).filter(Boolean))];
      if (ids.length > 0) {
        const { data: identities, error: idErr } = await supabase
          .from('identities')
          .select('id, name, image_url')
          .in('id', ids);

        if (idErr) {
          console.error('[MyVideos] identities query error:', idErr);
        } else {
          const map = {};
          (identities || []).forEach(i => {
            map[i.id] = i.name;
            map[`img_${i.id}`] = i.image_url;
          });
          setIdentityMap(map);
        }
      }
    } catch (err) {
      clearTimeout(timer);
      console.error('[MyVideos] unexpected error:', err);
      setFetchError(true);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [user]);

  // Load on mount / user change
  useEffect(() => {
    if (authLoading) return;       // wait for auth to resolve
    if (!user) { setLoading(false); return; }
    load();
  }, [user, authLoading, load]);

  // Handle ?job= param
  useEffect(() => {
    if (!jobParam) return;
    setHighlightedJob(jobParam);
    setToast('🎬 Your video is being generated — we\'ll update this page automatically.');

    // Remove from URL after 3 s
    const t = setTimeout(() => {
      window.history.replaceState({}, '', location.pathname);
    }, 3000);
    return () => clearTimeout(t);
  }, [jobParam, location.pathname]);

  // Scroll to highlighted card
  useEffect(() => {
    if (!highlightedJob || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedJob, jobs]);

  // ── Render states ──────────────────────────────────────────────────────────
  const showSkeleton = loading;

  if (showSkeleton) {
    return (
      <div className="mv-wrapper">
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
        <div className="mv-header">
          <div>
            <h1 className="mv-title">My Videos</h1>
            <p className="mv-subtitle">Your generated avatar videos</p>
          </div>
        </div>
        <div className="mv-grid">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="mv-wrapper">
        <div className="mv-state-center">
          <p className="mv-state-icon">⚠️</p>
          <p className="mv-state-title">Couldn't load your videos.</p>
          <p className="mv-state-sub">Please refresh and try again.</p>
          <button className="mv-btn mv-btn--primary" onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="mv-wrapper">
        <div className="mv-state-center">
          <p className="mv-state-icon">🎬</p>
          <p className="mv-state-title">No videos yet</p>
          <p className="mv-state-sub">Generate your first avatar video to see it here.</p>
          <button className="mv-btn mv-btn--primary" onClick={() => navigate('/generator')}>
            Generate a Video →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mv-wrapper">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div className="mv-header">
        <div>
          <h1 className="mv-title">My Videos</h1>
          <p className="mv-subtitle">Your generated avatar videos</p>
        </div>
        <div className="mv-header__right">
          <span className="mv-count-badge">{jobs.length} video{jobs.length !== 1 ? 's' : ''}</span>
          <button className="mv-btn mv-btn--primary" onClick={() => navigate('/generator')}>
            + New Video
          </button>
        </div>
      </div>

      <div className="mv-grid">
        {jobs.map(job => (
          <div
            key={job.id}
            ref={job.id === highlightedJob ? highlightRef : null}
          >
            <VideoCard
              job={job}
              identityMap={identityMap}
              highlighted={job.id === highlightedJob}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
