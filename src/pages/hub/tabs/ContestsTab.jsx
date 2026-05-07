import { useState, useEffect } from 'react';
import { CONTESTS, CONTEST_CATEGORIES, currentMonthSuffix } from '../data.js';
import { supabase } from '../../../lib/supabase.js';
import { useAuth } from '../../../hooks/useAuth.js';

const ADMIN_EMAIL = 'obviouslyinspiredstudio@outlook.com';

function buildMailtoLink(contest, form) {
  const subject = encodeURIComponent(`[Studio Flow] Contest Entry: ${contest.title}`);
  const body = encodeURIComponent(
    `Contest: ${contest.title}\n` +
    `Month: ${currentMonthSuffix()}\n\n` +
    `Name: ${form.name}\n` +
    `Email: ${form.email}\n` +
    `Content URL: ${form.contentUrl || 'N/A'}\n\n` +
    `Description:\n${form.description}\n\n` +
    `---\nSubmitted via Studio Flow`
  );
  return `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
}

/* ── Submission modal ─────────────────────────────────────────── */
function SubmissionModal({ contest, onClose, onSubmitted }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: user?.email || '', contentUrl: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit() {
    if (!form.name || !form.email) return;
    setSubmitting(true);
    try {
      await supabase.from('hub_submissions').insert({
        contest_id:  contest.id,
        user_id:     user?.id || null,
        name:        form.name,
        email:       form.email,
        content_url: form.contentUrl || null,
        description: form.description || null,
      });
    } catch (_) {}
    window.open(buildMailtoLink(contest, form), '_blank');
    setDone(true);
    setSubmitting(false);
    onSubmitted?.();
  }

  if (done) {
    return (
      <div className="hub-modal-backdrop" onClick={onClose}>
        <div className="hub-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
          <h2 className="hub-modal__title">Entry Submitted!</h2>
          <p className="hub-modal__sub">Your entry is recorded and the Studio Flow team has been notified. Good luck!</p>
          <button className="hub-btn hub-btn--gold" onClick={onClose} style={{ marginTop: '1rem' }}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="hub-modal-backdrop" onClick={onClose}>
      <div className="hub-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <h2 className="hub-modal__title" style={{ margin: 0 }}>{contest.emoji} {contest.title}</h2>
          <span className="hub-badge hub-badge--active" style={{ flexShrink: 0 }}>FREE</span>
        </div>
        <p className="hub-modal__sub">Entry is free. Fill in your details below.</p>

        <div className="hub-form-group">
          <label className="hub-form-label">Your Name *</label>
          <input className="hub-form-input" value={form.name} onChange={set('name')} placeholder="Full name" />
        </div>
        <div className="hub-form-group">
          <label className="hub-form-label">Email *</label>
          <input className="hub-form-input" type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" />
        </div>
        <div className="hub-form-group">
          <label className="hub-form-label">Content URL (video, image, link)</label>
          <input className="hub-form-input" value={form.contentUrl} onChange={set('contentUrl')} placeholder="https://youtube.com/..." />
        </div>
        <div className="hub-form-group">
          <label className="hub-form-label">Description</label>
          <textarea className="hub-form-textarea" value={form.description} onChange={set('description')} placeholder="Tell us about your entry…" />
        </div>

        <div className="hub-form-note">📧 Submission emailed to <strong>{ADMIN_EMAIL}</strong></div>

        <div className="hub-modal__actions">
          <button className="hub-btn hub-btn--ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="hub-btn hub-btn--gold" onClick={handleSubmit} disabled={submitting || !form.name || !form.email}>
            {submitting ? 'Submitting…' : 'Submit Entry — FREE'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Contest card ─────────────────────────────────────────────── */
function ContestCard({ contest }) {
  const { user } = useAuth();

  const [submissions,  setSubmissions]  = useState([]);
  const [showSubs,     setShowSubs]     = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [likedIds,     setLikedIds]     = useState(new Set());
  const [liking,       setLiking]       = useState(null);
  const [loadingSubs,  setLoadingSubs]  = useState(false);

  async function loadSubmissions() {
    setLoadingSubs(true);
    try {
      const { data } = await supabase
        .from('hub_submissions')
        .select('*')
        .eq('contest_id', contest.id)
        .order('vote_count', { ascending: false });
      setSubmissions(data || []);

      if (user && data?.length) {
        const { data: myLikes } = await supabase
          .from('hub_votes')
          .select('submission_id')
          .in('submission_id', data.map((s) => s.id));
        setLikedIds(new Set((myLikes || []).map((v) => v.submission_id)));
      }
    } catch (_) {
      setSubmissions([]);
    }
    setLoadingSubs(false);
  }

  useEffect(() => { if (showSubs) loadSubmissions(); }, [showSubs]);

  async function handleLike(subId) {
    if (!user || liking) return;
    setLiking(subId);
    const isLiked = likedIds.has(subId);
    try {
      if (isLiked) {
        await supabase.from('hub_votes').delete()
          .eq('submission_id', subId).eq('user_id', user.id);
      } else {
        const { error } = await supabase.from('hub_votes')
          .insert({ submission_id: subId, user_id: user.id });
        if (error && !error.message?.includes('unique')) throw error;
      }
      const cur = submissions.find((s) => s.id === subId)?.vote_count || 0;
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(subId); else next.add(subId);
        return next;
      });
      const newCount = Math.max(0, cur + (isLiked ? -1 : 1));
      setSubmissions((prev) =>
        [...prev.map((s) => s.id === subId ? { ...s, vote_count: newCount } : s)]
          .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
      );
      await supabase.from('hub_submissions')
        .update({ vote_count: newCount }).eq('id', subId);
    } catch (_) {}
    setLiking(null);
  }

  const catColors = {
    ai:       'var(--hub-blue)',
    sports:   '#f97316',
    film:     '#a855f7',
    creator:  'var(--hub-gold)',
    creative: 'var(--hub-green)',
  };
  const catColor = catColors[contest.category] || 'var(--hub-muted)';

  return (
    <>
      <div className="contest-card-hub">
        <div className="contest-card-hub__header" style={{ paddingTop: '1.25rem' }}>
          <span className="contest-card-hub__emoji">{contest.emoji}</span>
          <div className="contest-card-hub__meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
              <p className="contest-card-hub__title" style={{ margin: 0 }}>{contest.title}</p>
              <span className="hub-badge hub-badge--open">Open</span>
              <span style={{
                fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '6px',
                background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}40`,
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {contest.category}
              </span>
            </div>
            <p className="contest-card-hub__desc">{contest.description}</p>
          </div>
        </div>

        <div className="contest-card-hub__body">
          <div className="contest-card-hub__stat">
            <div className="contest-card-hub__stat-label">Entry</div>
            <div className="contest-card-hub__stat-value" style={{ color: 'var(--hub-green)' }}>FREE</div>
          </div>
          <div className="contest-card-hub__stat">
            <div className="contest-card-hub__stat-label">Submissions</div>
            <div className="contest-card-hub__stat-value">{submissions.length || '—'}</div>
          </div>
          <div className="contest-card-hub__stat">
            <div className="contest-card-hub__stat-label">Winner</div>
            <div className="contest-card-hub__stat-value" style={{ fontSize: '0.8rem', color: 'var(--hub-muted)' }}>Admin selects</div>
          </div>
        </div>

        <div className="contest-card-hub__actions" style={{ flexWrap: 'wrap', gap: '0.625rem' }}>
          <button className="hub-btn hub-btn--green" onClick={() => setShowModal(true)}>
            ✏ Submit Entry — FREE
          </button>
          <button className="hub-btn hub-btn--blue" onClick={() => setShowSubs((v) => !v)}>
            ❤ {showSubs ? 'Hide' : 'View'} Entries
          </button>
        </div>

        {showSubs && (
          <div className="submissions-panel">
            {loadingSubs && (
              <div style={{ padding: '1.25rem', textAlign: 'center' }}>
                <div className="cinematic-spinner" style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto' }} />
              </div>
            )}
            {!loadingSubs && submissions.length === 0 && (
              <div style={{ padding: '1rem 1.25rem', color: 'var(--hub-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                No submissions yet — be the first!
              </div>
            )}
            {!loadingSubs && submissions.length > 0 && (
              <div style={{ padding: '0.625rem 1.25rem 0.375rem', fontSize: '0.75rem', color: 'var(--hub-muted)' }}>
                Sorted by most liked · Like to support your favorites
              </div>
            )}
            {!loadingSubs && submissions.map((sub, i) => (
              <div key={sub.id} className="submission-item"
                style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                <div style={{ width: '24px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--hub-muted)', flexShrink: 0 }}>
                  #{i + 1}
                </div>
                <div className="submission-item__body">
                  <p className="submission-item__name">{sub.name}</p>
                  {sub.description && <p className="submission-item__desc">{sub.description}</p>}
                  {sub.content_url && (
                    <a href={sub.content_url} target="_blank" rel="noopener noreferrer" className="submission-item__link">
                      ▶ Watch / View Content
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                  <button
                    className={`vote-btn-hub${likedIds.has(sub.id) ? ' vote-btn-hub--voted' : ''}`}
                    onClick={() => handleLike(sub.id)}
                    disabled={liking === sub.id || !user}
                    title={!user ? 'Log in to like' : likedIds.has(sub.id) ? 'Unlike' : 'Like this entry'}
                  >
                    {likedIds.has(sub.id) ? '♥ Liked' : '♡ Like'} · {sub.vote_count || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <SubmissionModal
          contest={contest}
          onClose={() => setShowModal(false)}
          onSubmitted={loadSubmissions}
        />
      )}
    </>
  );
}

/* ── Contests tab ─────────────────────────────────────────────── */
export default function ContestsTab() {
  const [activeCategory, setActiveCategory] = useState('all');
  const now = new Date();
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const filtered = activeCategory === 'all'
    ? CONTESTS
    : CONTESTS.filter((c) => c.category === activeCategory);

  return (
    <div className="hub-content">
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
          <h1 className="hub-section-title" style={{ fontSize: '1.6rem', margin: 0 }}>🏆 Monthly Contests</h1>
          <span style={{
            fontSize: '0.78rem', padding: '0.25rem 0.75rem', borderRadius: '20px',
            background: 'rgba(245,166,35,0.1)', color: 'var(--hub-gold)',
            border: '1px solid rgba(245,166,35,0.3)', fontWeight: 600,
          }}>
            {monthLabel}
          </span>
        </div>
        <p style={{ color: 'var(--hub-muted)', fontSize: '0.9rem', margin: 0 }}>
          {CONTESTS.length} contests · Free entry · Like your favorites · Winners selected by admin
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.625rem', marginBottom: '1.25rem' }}>
        {[
          { icon: '✏',  label: 'Submit Entry',   detail: 'Free for everyone',          color: 'var(--hub-green)' },
          { icon: '❤',  label: 'Like Entries',   detail: 'Support your favorites',     color: '#f87171' },
          { icon: '🏆', label: 'Prize Pool',     detail: 'Admin-determined payouts',   color: '#f97316' },
          { icon: '🛡', label: 'Admin Selects',  detail: 'Based on likes & quality',  color: 'var(--hub-gold)' },
        ].map((step) => (
          <div key={step.label} style={{ background: 'var(--hub-card)', border: '1px solid var(--hub-border)', borderRadius: '10px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{step.icon}</span>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: step.color }}>{step.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--hub-muted)' }}>{step.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {CONTEST_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '0.35rem 0.875rem', borderRadius: '20px', border: '1px solid',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background: activeCategory === cat.id ? 'var(--hub-gold)' : 'transparent',
              color:      activeCategory === cat.id ? '#000' : 'var(--hub-muted)',
              borderColor: activeCategory === cat.id ? 'var(--hub-gold)' : 'var(--hub-border)',
            }}
          >
            {cat.label}
            {cat.id !== 'all' && (
              <span style={{ marginLeft: '0.35rem', opacity: 0.65 }}>
                ({CONTESTS.filter((c) => c.category === cat.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--hub-muted)', marginBottom: '1rem' }}>
        Showing {filtered.length} of {CONTESTS.length} contests
      </p>

      <div className="hub-contests-grid">
        {filtered.map((c) => (
          <ContestCard key={c.id} contest={c} />
        ))}
      </div>
    </div>
  );
}
