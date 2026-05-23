import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useMembership } from '../../modules/memberships';
import { supabase } from '../../lib/supabaseClient';

const CATEGORIES = [
  'Comedy','Music','Dance','Fitness','Gaming','Education',
  'Cooking','Motivation','Kids','Talk Show','Tutorials','Art',
];

const DONATION_LINK = 'https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t';

export default function NewEventPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { tier, loading: memberLoading } = useMembership();

  const [form, setForm] = useState({
    title:         '',
    description:   '',
    category:      '',
    thumbnail_url: '',
    video_url:     '',
    is_live:       false,
  });

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const thumbRef = useRef(null);
  const [thumbPreview, setThumbPreview] = useState('');

  const loading = authLoading || memberLoading;
  const isCreator50 = tier === 'creator_50';

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleThumbUpload(file) {
    if (!file) return;
    const { data: { session } } = await supabase.auth.getSession();
    const ext  = file.name.split('.').pop();
    const path = `thumbnails/${session.user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('studio-flow-library')
      .upload(path, file, { upsert: true });
    if (upErr) { setError(upErr.message); return; }
    const { data: { publicUrl } } = supabase.storage
      .from('studio-flow-library')
      .getPublicUrl(path);
    set('thumbnail_url', publicUrl);
    setThumbPreview(publicUrl);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.category)     { setError('Category is required.'); return; }

    setSaving(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be signed in.');

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
          thumbnail_url: form.thumbnail_url || null,
          video_url:     form.video_url.trim() || null,
          is_live:       form.is_live,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to create event.');

      navigate(`/event/${json.data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

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
          Posting events directly requires the <strong style={{ color: '#a78bfa' }}>$50 Creator</strong> membership tier.
          Upgrade to start publishing your content without waiting for approval.
        </p>
        <Link to="/membership" className="btn btn--primary" style={{ textDecoration: 'none' }}>
          Upgrade to Creator
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <Link to="/events" style={{ fontSize: '0.82rem', color: 'rgba(200,200,215,0.4)', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>
        ← Back to Events
      </Link>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.3rem' }}>🎬 Post New Event</h1>
      <p style={mutedText}>Your event will be published immediately — no admin approval needed.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>

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
            placeholder="What will viewers experience?"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
          />
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>Category *</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            required
            style={{
              width: '100%', padding: '0.55rem 0.8rem',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px', color: form.category ? '#fff' : 'rgba(200,200,215,0.4)',
              fontSize: '0.9rem', outline: 'none',
            }}
          >
            <option value="" disabled>Select a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} style={{ background: '#1a1a2e', color: '#fff' }}>{c}</option>
            ))}
          </select>
        </div>

        {/* Thumbnail */}
        <div>
          <label style={labelStyle}>Thumbnail</label>
          {thumbPreview ? (
            <div style={{ marginBottom: '0.5rem' }}>
              <img src={thumbPreview} alt="Thumbnail preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }} />
              <button type="button" onClick={() => { setThumbPreview(''); set('thumbnail_url', ''); }} style={ghostBtn}>
                Remove
              </button>
            </div>
          ) : (
            <>
              <div
                onClick={() => thumbRef.current?.click()}
                style={{
                  border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '10px',
                  padding: '2rem 1rem', textAlign: 'center', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.02)', marginBottom: '0.5rem',
                }}
              >
                <div style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>🖼</div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(200,200,215,0.45)' }}>Click to upload thumbnail</p>
              </div>
              <input
                ref={thumbRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleThumbUpload(e.target.files[0])}
              />
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'rgba(200,200,215,0.3)' }}>
                Or paste a URL:
              </p>
              <input
                className="cinematic-input"
                placeholder="https://…"
                value={form.thumbnail_url}
                onChange={(e) => { set('thumbnail_url', e.target.value); setThumbPreview(e.target.value); }}
                style={{ marginTop: '0.35rem' }}
              />
            </>
          )}
        </div>

        {/* Live vs Recorded toggle */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {[
            { value: false, label: '🎬 Recorded / Uploaded', desc: 'Paste a video URL or upload' },
            { value: true,  label: '📡 Go Live',             desc: 'Stream in real-time via RTMP/OBS' },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => set('is_live', opt.value)}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: form.is_live === opt.value ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.03)',
                border: form.is_live === opt.value ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(255,255,255,0.08)',
                color: form.is_live === opt.value ? '#a78bfa' : 'rgba(200,200,215,0.6)',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.2rem' }}>{opt.label}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.65 }}>{opt.desc}</div>
            </button>
          ))}
        </div>

        {/* Video URL (recorded only) */}
        {!form.is_live && (
          <div>
            <label style={labelStyle}>Video URL <span style={{ color: 'rgba(200,200,215,0.3)', fontWeight: 400 }}>(optional)</span></label>
            <input
              className="cinematic-input"
              placeholder="YouTube, Vimeo, or direct .mp4 link"
              value={form.video_url}
              onChange={(e) => set('video_url', e.target.value)}
            />
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: 'rgba(200,200,215,0.35)' }}>
              You can also upload a video after creating the event.
            </p>
          </div>
        )}

        {/* Donation info */}
        <div style={{ padding: '0.85rem 1rem', background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.18)', borderRadius: '10px', fontSize: '0.82rem', color: 'rgba(200,200,215,0.6)' }}>
          💛 A <strong style={{ color: '#f5a623' }}>Support This Event</strong> donation button will appear on your event page automatically.
        </div>

        {error && (
          <div style={{ padding: '0.65rem 0.875rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" className="cinematic-button" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="cinematic-button-accent" disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Publishing…' : form.is_live ? '📡 Publish Live Event' : '🎬 Publish Event'}
          </button>
        </div>

      </form>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600,
  color: 'rgba(200,200,215,0.65)', marginBottom: '0.35rem', letterSpacing: '0.02em',
};

const mutedText = {
  color: 'rgba(200,200,215,0.5)', fontSize: '0.9rem', margin: '0 0 0.75rem',
};

const centeredBox = {
  maxWidth: '480px', margin: '4rem auto', textAlign: 'center', padding: '1.5rem',
};

const ghostBtn = {
  background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px', color: 'rgba(200,200,215,0.5)', fontSize: '0.75rem',
  cursor: 'pointer', padding: '0.25rem 0.65rem', marginTop: '0.35rem',
};
