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

// ─── Confirm delete modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({ onCancel, onConfirm, deleting }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px', padding: '1.75rem 1.5rem',
        maxWidth: 360, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        <h3 style={{ margin: '0 0 0.6rem', fontSize: '1rem', fontWeight: 700, color: 'rgba(220,220,235,0.9)' }}>
          Delete this video?
        </h3>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'rgba(200,200,215,0.55)', lineHeight: 1.55 }}>
          This will permanently remove the video from your account. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(200,200,215,0.7)', fontSize: '0.85rem', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.35)', color: 'rgba(252,165,165,0.9)', fontSize: '0.85rem', cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: deleting ? 0.7 : 1 }}
          >
            {deleting && <span className="ci-spinner" style={{ width: 12, height: 12 }} />}
            {deleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
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
function VideoCard({ job, identityMap, highlighted, user, onDeleteSuccess, onDeleteError }) {
  const navigate = useNavigate();
  const [localJob, setLocalJob]       = useState(job);
  const [showModal, setShowModal]     = useState(false);
  const [deleting, setDeleting]       = useState(false);

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

  async function handleConfirmDelete() {
    setDeleting(true);
    const { error } = await supabase
      .from('render_jobs')
      .delete()
      .eq('id', localJob.id)
      .eq('creator_id', user.id);

    if (error) {
      setDeleting(false);
      setShowModal(false);
      onDeleteError('Couldn\'t delete video. Try again.');
    } else {
      setShowModal(false);
      onDeleteSuccess(localJob.id);
    }
  }

  const { status, video_url, error_message, error: errorField, identity_id, created_at } = localJob;
  const errorText = error_message || errorField;
  const identityName = identityMap[identity_id] ?? 'Unknown identity';
  const videoUrl = Array.isArray(video_url) ? video_url[0] : video_url;

  function copyLink() {
    if (videoUrl) navigator.clipboard.writeText(videoUrl).catch(() => {});
  }

  return (
    <div className={`mv-card${highlighted ? ' mv-card--highlighted' : ''}`}>

      {/* Video / placeholder area */}
      {status === 'completed' ? (
        localJob.video_url ? (
          <video
            controls
            src={localJob.video_url}
            style={{ width: '100%', borderRadius: '8px', display: 'block' }}
          />
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem', color: 'rgba(200,200,215,0.6)' }}>
            Video processing...
          </div>
        )
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

        {status === 'failed' && errorText && (
          <p className="mv-card__error">{errorText}</p>
        )}

        {status === 'completed' && (() => {
          const scriptText    = localJob.script || localJob.script_text || '';
          const scriptPreview = scriptText.length > 120 ? scriptText.slice(0, 120) + '...' : scriptText;
          const scenes        = localJob.scenes;
          const scenesPreview = scenes
            ? (typeof scenes === 'string'
                ? scenes.slice(0, 100) + (scenes.length > 100 ? '...' : '')
                : JSON.stringify(scenes).slice(0, 100) + '...')
            : null;

          if (!scriptPreview && !scenesPreview) return null;

          return (
            <div style={{
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {scriptPreview && (
                <div>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(200,200,215,0.35)' }}>
                    📝 Script
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(200,200,215,0.55)', lineHeight: 1.5 }}>
                    {scriptPreview}
                  </p>
                </div>
              )}
              {scenesPreview && (
                <div>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(200,200,215,0.35)' }}>
                    🎬 Scene
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(200,200,215,0.55)', lineHeight: 1.5 }}>
                    {scenesPreview}
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {status === 'completed' && videoUrl && (
          <div className="mv-card__actions">
            <a className="mv-btn mv-btn--sm" href={videoUrl} download>
              Download
            </a>
            <button className="mv-btn mv-btn--sm" onClick={copyLink}>
              Share
            </button>
            <button
              className="mv-btn mv-btn--sm"
              onClick={() => setShowModal(true)}
              style={{ color: 'rgba(252,165,165,0.75)', borderColor: 'rgba(220,38,38,0.25)' }}
            >
              🗑️ Delete
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="mv-card__actions">
            <button className="mv-btn mv-btn--sm mv-btn--primary" onClick={() => navigate('/generator')}>
              Try Again
            </button>
            <button
              className="mv-btn mv-btn--sm"
              onClick={() => setShowModal(true)}
              style={{ color: 'rgba(252,165,165,0.75)', borderColor: 'rgba(220,38,38,0.25)' }}
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <ConfirmDeleteModal
          deleting={deleting}
          onCancel={() => setShowModal(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
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
        .select('id, status, video_url, script, script_text, created_at, completed_at, error_message, identity_id, creator_id')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      clearTimeout(timer);

      console.log('My Videos — user.id:', user.id);
      console.log('My Videos — data:', data);
      console.log('My Videos — error:', error);

      if (error) {
        setFetchError(true);
        setLoading(false);
        return;
      }

      const rows = data ?? [];
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
          <button className="mv-btn mv-btn--primary" onClick={() => navigate('/create-identity')}>
            Create Avatar →
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
              user={user}
              onDeleteSuccess={id => {
                setJobs(prev => prev.filter(j => j.id !== id));
                setToast('Video deleted.');
              }}
              onDeleteError={msg => setToast(msg)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
