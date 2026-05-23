import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth }           from '../../hooks/useAuth';
import { useMembership }     from '../../modules/memberships';
import { isCreatorAdmin }    from '../../lib/roles';
import { supabase }          from '../../lib/supabaseClient';

const CATEGORIES = [
  'Comedy','Music','Dance','Fitness','Gaming','Education',
  'Cooking','Motivation','Kids','Talk Show','Tutorials','Art',
];

const BUCKET = 'studio-flow-library';

export default function NewEventPage() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const { tier, loading: memberLoading }     = useMembership();

  const [form, setForm] = useState({
    title:       '',
    description: '',
    category:    '',
    is_live:     false,
  });

  const [thumbFile,    setThumbFile]    = useState(null);
  const [thumbPreview, setThumbPreview] = useState('');
  const [thumbUrl,     setThumbUrl]     = useState('');
  const [thumbPasteUrl, setThumbPasteUrl] = useState('');

  const [videoFile,    setVideoFile]    = useState(null);
  const [videoUrl,     setVideoUrl]     = useState('');
  const [videoPasteUrl, setVideoPasteUrl] = useState('');
  const [videoProgress, setVideoProgress] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const thumbRef = useRef(null);
  const videoRef = useRef(null);

  const loading     = authLoading || memberLoading;
  const isAdmin     = isCreatorAdmin(role);
  const isCreator50 = tier === 'creator_50' || isAdmin;

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /* ── Thumbnail upload ── */
  async function handleThumbFile(file) {
    if (!file) return;
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
    setThumbPasteUrl('');
    setThumbUrl(''); // will be resolved on submit
  }

  function handleThumbPaste(url) {
    setThumbPasteUrl(url);
    setThumbPreview(url);
    setThumbFile(null);
    setThumbUrl(url);
  }

  function clearThumb() {
    setThumbFile(null);
    setThumbPreview('');
    setThumbUrl('');
    setThumbPasteUrl('');
  }

  /* ── Video upload with XMLHttpRequest (for progress) ── */
  async function uploadVideoFile(file, session) {
    const ext  = file.name.split('.').pop();
    const path = `videos/${session.user.id}/${Date.now()}.${ext}`;
    const { data: { publicUrl: uploadUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path); // just to build the path

    setUploadingVideo(true);
    setVideoProgress(0);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const { data: { session: _s } } = { data: { session } };

      // Use the Supabase REST storage endpoint directly
      const supabaseUrl   = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const endpoint = `${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setVideoProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        setUploadingVideo(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          const pub = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
          resolve(pub);
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText || xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        setUploadingVideo(false);
        reject(new Error('Network error during video upload.'));
      });

      xhr.open('POST', endpoint);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.send(file);
    });
  }

  /* ── Upload thumbnail via Supabase JS client ── */
  async function uploadThumb(session) {
    if (!thumbFile) return thumbUrl || thumbPasteUrl || null;
    const ext  = thumbFile.name.split('.').pop();
    const path = `thumbnails/${session.user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, thumbFile, { upsert: true });
    if (upErr) throw new Error('Thumbnail upload failed: ' + upErr.message);
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return publicUrl;
  }

  /* ── Submit ── */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.category)     { setError('Please choose a category.'); return; }

    setSaving(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be signed in.');

      // 1. Upload thumbnail (if file chosen)
      const finalThumbUrl = await uploadThumb(session);

      // 2. Upload video file (if chosen), otherwise use paste URL
      let finalVideoUrl = videoPasteUrl.trim() || null;
      if (videoFile && !form.is_live) {
        finalVideoUrl = await uploadVideoFile(videoFile, session);
      }

      // 3. Create event slot via API
      const res = await fetch('/api/creator/events', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title:         form.title.trim(),
          description:   form.description.trim() || null,
          category:      form.category,
          thumbnail_url: finalThumbUrl || null,
          video_url:     finalVideoUrl || null,
          is_live:       form.is_live,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to create event.');

      navigate('/creator/events');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setUploadingVideo(false);
    }
  }

  /* ── Guards ── */
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="cinematic-spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={centeredBox}>
        <p style={mutedText}>You must be signed in to post events.</p>
        <Link to="/login" className="btn btn--primary">Sign In</Link>
      </div>
    );
  }

  if (!isCreator50) {
    return (
      <div style={centeredBox}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎬</div>
        <h2 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>Creator Membership Required</h2>
        <p style={{ ...mutedText, marginBottom: '1.25rem', maxWidth: '420px' }}>
          Posting events requires the <strong style={{ color: '#a78bfa' }}>$50 Creator</strong> tier.
          Upgrade to publish your content instantly — no approval needed.
        </p>
        <Link to="/membership" className="btn btn--primary" style={{ textDecoration: 'none' }}>
          Upgrade to Creator →
        </Link>
      </div>
    );
  }

  /* ── Form ── */
  const isBusy = saving || uploadingVideo;

  return (
    <div className="page-container" style={{ maxWidth: '960px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/creator/events" style={{ fontSize: '0.82rem', color: 'rgba(200,200,215,0.4)', textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}>
          ← My Events
        </Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.3rem' }}>🎬 Post New Event</h1>
        <p style={mutedText}>Your event publishes immediately — no admin approval needed.</p>
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── Two-column grid ── */}
        <div style={twoCol}>

          {/* LEFT column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Title */}
            <div>
              <label style={labelStyle}>Event Title *</label>
              <input
                className="cinematic-input"
                placeholder="e.g. Friday Night Comedy Showcase"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                className="cinematic-textarea"
                placeholder="What will viewers experience? (Optional)"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Category */}
            <div>
              <label style={labelStyle}>Category *</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                required
                style={selectStyle(!!form.category)}
              >
                <option value="" disabled>Select a category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ background: '#1a1a2e', color: '#fff' }}>{c}</option>
                ))}
              </select>
            </div>

            {/* Live vs Recorded toggle */}
            <div>
              <label style={labelStyle}>Event Type</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {[
                  { value: false, icon: '🎬', label: 'Recorded / Uploaded', desc: 'Upload a video or paste a URL' },
                  { value: true,  icon: '📡', label: 'Go Live',             desc: 'Stream via RTMP / OBS in real-time' },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => set('is_live', opt.value)}
                    style={typeToggle(form.is_live === opt.value)}
                  >
                    <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.25rem' }}>{opt.icon}</span>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.15rem' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6, lineHeight: 1.3 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Thumbnail */}
            <div>
              <label style={labelStyle}>Thumbnail</label>
              {thumbPreview ? (
                <div>
                  <img
                    src={thumbPreview}
                    alt="Preview"
                    style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}
                  />
                  <button type="button" onClick={clearThumb} style={ghostBtn}>✕ Remove</button>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => thumbRef.current?.click()}
                    style={dropZone}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleThumbFile(e.dataTransfer.files[0]); }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🖼</div>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.83rem', color: 'rgba(200,200,215,0.6)', fontWeight: 600 }}>
                      Click or drag to upload thumbnail
                    </p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(200,200,215,0.3)' }}>JPG, PNG, WebP — 16:9 recommended</p>
                  </div>
                  <input ref={thumbRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => handleThumbFile(e.target.files[0])} />
                  <p style={{ margin: '0.5rem 0 0.25rem', fontSize: '0.72rem', color: 'rgba(200,200,215,0.3)' }}>Or paste a URL:</p>
                  <input
                    className="cinematic-input"
                    placeholder="https://…"
                    value={thumbPasteUrl}
                    onChange={(e) => handleThumbPaste(e.target.value)}
                    style={{ marginTop: 0 }}
                  />
                </>
              )}
            </div>

            {/* Video upload (recorded only) */}
            {!form.is_live && (
              <div>
                <label style={labelStyle}>
                  Video
                  <span style={{ fontWeight: 400, color: 'rgba(200,200,215,0.35)', marginLeft: '0.4rem' }}>optional</span>
                </label>

                {videoFile ? (
                  <div style={{ padding: '0.875rem 1rem', background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: uploadingVideo ? '0.75rem' : 0 }}>
                      <div style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📹 {videoFile.name}
                      </div>
                      <button type="button" onClick={() => { setVideoFile(null); setVideoProgress(0); }} style={ghostBtn}>✕</button>
                    </div>
                    {uploadingVideo && (
                      <>
                        <div style={progressTrack}>
                          <div style={{ ...progressBar, width: `${videoProgress}%` }} />
                        </div>
                        <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: 'rgba(200,200,215,0.4)' }}>
                          Uploading… {videoProgress}%
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div
                      onClick={() => videoRef.current?.click()}
                      style={{ ...dropZone, background: 'rgba(52,211,153,0.03)', borderColor: 'rgba(52,211,153,0.15)' }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('video/')) setVideoFile(f); }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🎥</div>
                      <p style={{ margin: '0 0 0.2rem', fontSize: '0.83rem', color: 'rgba(200,200,215,0.6)', fontWeight: 600 }}>
                        Click or drag to upload video
                      </p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(200,200,215,0.3)' }}>MP4, MOV, WebM</p>
                    </div>
                    <input ref={videoRef} type="file" accept="video/*" style={{ display: 'none' }}
                      onChange={(e) => setVideoFile(e.target.files[0])} />
                    <p style={{ margin: '0.5rem 0 0.25rem', fontSize: '0.72rem', color: 'rgba(200,200,215,0.3)' }}>Or paste a YouTube / Vimeo / .mp4 URL:</p>
                    <input
                      className="cinematic-input"
                      placeholder="https://…"
                      value={videoPasteUrl}
                      onChange={(e) => setVideoPasteUrl(e.target.value)}
                      style={{ marginTop: 0 }}
                    />
                  </>
                )}
              </div>
            )}

            {/* Live info banner */}
            {form.is_live && (
              <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', fontSize: '0.82rem', color: 'rgba(200,200,215,0.65)', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 0.4rem', fontWeight: 700, color: '#f87171' }}>📡 Live Stream</p>
                After publishing, you'll receive a <strong>Stream Key</strong> and <strong>RTMP URL</strong> on the event page.
                Point your OBS or streaming app there to go live.
              </div>
            )}

            {/* Donation notice */}
            <div style={{ padding: '0.85rem 1rem', background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.18)', borderRadius: '10px', fontSize: '0.82rem', color: 'rgba(200,200,215,0.6)' }}>
              💛 A <strong style={{ color: '#f5a623' }}>Support This Creator</strong> donate button appears on your event page automatically.
            </div>

          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.875rem', marginTop: '1.5rem' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="cinematic-button"
            onClick={() => navigate('/creator/events')}
            disabled={isBusy}
            style={{ minWidth: '100px' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cinematic-button-accent"
            disabled={isBusy}
            style={{ flex: 1, minWidth: '180px' }}
          >
            {isBusy
              ? uploadingVideo
                ? `Uploading video… ${videoProgress}%`
                : 'Publishing…'
              : form.is_live
              ? '📡 Publish Live Event'
              : '🎬 Publish Event'}
          </button>
        </div>

      </form>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */
const labelStyle = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600,
  color: 'rgba(200,200,215,0.65)', marginBottom: '0.4rem', letterSpacing: '0.02em',
};

const mutedText = {
  color: 'rgba(200,200,215,0.45)', fontSize: '0.9rem', margin: '0 0 0.5rem',
};

const centeredBox = {
  maxWidth: '480px', margin: '4rem auto', textAlign: 'center', padding: '1.5rem',
};

const ghostBtn = {
  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px', color: 'rgba(200,200,215,0.45)', fontSize: '0.72rem',
  cursor: 'pointer', padding: '0.2rem 0.6rem',
};

const dropZone = {
  border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '12px',
  padding: '1.75rem 1rem', textAlign: 'center', cursor: 'pointer',
  background: 'rgba(255,255,255,0.02)', transition: 'border-color 0.15s',
};

const twoCol = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '2rem',
  alignItems: 'start',
};

const progressTrack = {
  width: '100%', height: '6px', borderRadius: '999px',
  background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
};

const progressBar = {
  height: '100%', borderRadius: '999px',
  background: 'linear-gradient(90deg, #34d399, #059669)',
  transition: 'width 0.2s ease',
};

function selectStyle(hasValue) {
  return {
    width: '100%', padding: '0.55rem 0.8rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: hasValue ? '#fff' : 'rgba(200,200,215,0.4)',
    fontSize: '0.9rem', outline: 'none',
  };
}

function typeToggle(active) {
  return {
    flex: 1, padding: '0.875rem 0.75rem', borderRadius: '12px', cursor: 'pointer',
    background: active ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${active ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.08)'}`,
    color: active ? '#a78bfa' : 'rgba(200,200,215,0.55)',
    textAlign: 'left', transition: 'all 0.15s',
  };
}
