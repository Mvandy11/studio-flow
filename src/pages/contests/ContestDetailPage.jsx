import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import '../../styles/contests.css';
import '../../styles/portfolio.css';

export default function ContestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contest,   setContest]   = useState(null);
  const [entries,   setEntries]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // submission form
  const [subTitle,    setSubTitle]    = useState('');
  const [subDesc,     setSubDesc]     = useState('');
  const [subFile,     setSubFile]     = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [subError,    setSubError]    = useState(null);
  const [subSuccess,  setSubSuccess]  = useState(false);
  const fileRef = useRef(null);

  // likes state: { [entryId]: count }
  const [likeCounts,  setLikeCounts]  = useState({});
  // set of entry IDs the current user has liked
  const [likedEntries, setLikedEntries] = useState(new Set());
  const [liking, setLiking] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contests/${id}`);
      if (!res.ok) throw new Error('Contest not found.');
      const { contest: c, entries: e } = await res.json();
      setContest(c);
      // Sort entries by like count descending (will be updated after likes load)
      setEntries(e);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  // Load like counts for all entries
  useEffect(() => {
    if (entries.length === 0) return;
    const ids = entries.map((e) => e.id);

    // Fetch all likes for these entries in one query
    supabase
      .from('likes')
      .select('entry_id')
      .in('entry_id', ids)
      .then(({ data }) => {
        if (!data) return;
        const counts = {};
        for (const row of data) {
          counts[row.entry_id] = (counts[row.entry_id] || 0) + 1;
        }
        setLikeCounts(counts);
        // Re-sort entries by like count
        setEntries((prev) =>
          [...prev].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
        );
      });

    // Fetch which entries the current user liked
    if (user) {
      supabase
        .from('likes')
        .select('entry_id')
        .in('entry_id', ids)
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (data) setLikedEntries(new Set(data.map((r) => r.entry_id)));
        });
    }
  }, [entries.length, user]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user)          { setSubError('You must be logged in to submit.'); return; }
    if (!subTitle.trim()) { setSubError('Please enter a title.'); return; }

    setSubmitting(true);
    setSubError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const form = new FormData();
      form.append('title', subTitle);
      form.append('description', subDesc);
      if (subFile) form.append('file', subFile);

      const res = await fetch(`/api/contests/${id}/entries`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed.');
      setSubSuccess(true);
      setSubTitle(''); setSubDesc(''); setSubFile(null);
      load();
    } catch (err) {
      setSubError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(entryId) {
    if (!user) { alert('You must be logged in to like an entry.'); return; }
    setLiking(entryId);
    const isLiked = likedEntries.has(entryId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/likes', {
        method: isLiked ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entryId }),
      });
      if (!res.ok) throw new Error('Action failed.');

      setLikedEntries((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(entryId); else next.add(entryId);
        return next;
      });
      setLikeCounts((prev) => ({
        ...prev,
        [entryId]: Math.max(0, (prev[entryId] || 0) + (isLiked ? -1 : 1)),
      }));
      // Re-sort entries by updated like count
      setEntries((prev) =>
        [...prev].sort((a, b) => {
          const ca = (likeCounts[b.id] || 0) + (b.id === entryId && !isLiked ? 1 : b.id === entryId && isLiked ? -1 : 0);
          const cb = (likeCounts[a.id] || 0) + (a.id === entryId && !isLiked ? 1 : a.id === entryId && isLiked ? -1 : 0);
          return ca - cb;
        })
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setLiking(null);
    }
  }

  if (loading) return (
    <div className="page-container" style={{ textAlign:'center', paddingTop:'4rem' }}>
      <div className="cinematic-spinner" />
    </div>
  );

  if (error) return (
    <div className="page-container" style={{ textAlign:'center', paddingTop:'4rem' }}>
      <p style={{ color:'#fca5a5' }}>{error}</p>
      <button className="cinematic-button" onClick={() => navigate('/contests')}>Back to Contests</button>
    </div>
  );

  const canSubmit = contest.status === 'active' || contest.status === 'draft';
  const isCompleted = contest.status === 'completed';

  return (
    <div className="page-container">
      {contest.thumbnail_url && (
        <img src={contest.thumbnail_url} alt={contest.title} className="contest-detail__hero" />
      )}

      <h1 className="page-title">{contest.title}</h1>

      <div className="contest-detail__meta-row">
        {contest.prize_pool > 0 && (
          <div className="contest-detail__stat">
            <div className="contest-detail__stat-label">Prize Pool</div>
            <div className="contest-detail__prize-pool">
              ${Number(contest.prize_pool).toLocaleString()}
            </div>
          </div>
        )}
        <div className="contest-detail__stat">
          <div className="contest-detail__stat-label">Entries</div>
          <div className="contest-detail__stat-value">{entries.length}</div>
        </div>
        {contest.winner_count > 1 && (
          <div className="contest-detail__stat">
            <div className="contest-detail__stat-label">Winners</div>
            <div className="contest-detail__stat-value">Top {contest.winner_count}</div>
          </div>
        )}
        {contest.submission_end && (
          <div className="contest-detail__stat">
            <div className="contest-detail__stat-label">Submissions Close</div>
            <div className="contest-detail__stat-value">
              {format(new Date(contest.submission_end), 'MMM d, yyyy')}
            </div>
          </div>
        )}
      </div>

      {contest.description && (
        <p className="contest-detail__description">{contest.description}</p>
      )}

      {/* ── Submission Form ── */}
      {canSubmit && user && !subSuccess && (
        <div className="contest-submit-form">
          <h2 className="contest-submit-form__title">Submit Your Entry</h2>
          {subError && <p style={{ color:'#fca5a5', margin:0 }}>{subError}</p>}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              placeholder="Entry title"
              disabled={submitting}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={subDesc}
              onChange={(e) => setSubDesc(e.target.value)}
              placeholder="Tell us about your entry…"
              disabled={submitting}
            />
          </div>
          <div className="form-group">
            <label className="form-label">File (optional)</label>
            <input
              ref={fileRef}
              type="file"
              style={{ display:'none' }}
              onChange={(e) => setSubFile(e.target.files[0] || null)}
            />
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <button
                type="button"
                className="cinematic-button"
                onClick={() => fileRef.current?.click()}
                disabled={submitting}
              >
                {subFile ? '✓ File selected' : 'Choose file'}
              </button>
              {subFile && <span style={{ fontSize:'0.82rem', opacity:0.6 }}>{subFile.name}</span>}
            </div>
          </div>
          <div>
            <button
              className="btn btn--primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit Entry'}
            </button>
          </div>
        </div>
      )}

      {subSuccess && (
        <div style={{ padding:'1rem 1.25rem', borderRadius:'12px', background:'rgba(134,239,172,0.1)', border:'1px solid rgba(134,239,172,0.3)', color:'#86efac', marginBottom:'1.5rem' }}>
          ✓ Your entry has been submitted! Good luck.
        </div>
      )}

      {canSubmit && !user && (
        <div style={{ padding:'1rem', borderRadius:'12px', background:'rgba(110,168,255,0.08)', border:'1px solid rgba(110,168,255,0.2)', color:'var(--accent-blue)', marginBottom:'1.5rem', textAlign:'center' }}>
          Log in to submit your entry.
        </div>
      )}

      {/* ── Entries (sorted by likes) ── */}
      {entries.length > 0 && (
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">
            {isCompleted ? '🥇 Results' : `Entries (${entries.length})`}
          </h2>
          {!isCompleted && (
            <p style={{ fontSize:'0.82rem', color:'rgba(200,200,215,0.5)', marginBottom:'1rem' }}>
              Sorted by most liked. Winners are selected by the admin based on likes and quality.
            </p>
          )}
          <div className="contest-entries-grid">
            {entries.map((entry) => {
              const count   = likeCounts[entry.id] || 0;
              const isLiked = likedEntries.has(entry.id);
              return (
                <div key={entry.id} className="contest-entry-card">
                  {entry.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(entry.file_url) && (
                    <img src={entry.file_url} alt={entry.title} className="contest-entry-card__thumb" loading="lazy" />
                  )}
                  {entry.file_url && /\.(mp4|mov|webm)$/i.test(entry.file_url) && (
                    <video src={entry.file_url} className="contest-entry-card__thumb" controls preload="metadata" />
                  )}
                  <div className="contest-entry-card__body">
                    <h3 className="contest-entry-card__title">{entry.title}</h3>
                    {entry.description && (
                      <p className="contest-entry-card__desc">{entry.description}</p>
                    )}
                    {entry.is_winner && (
                      <span className="contest-winner-badge">
                        {entry.winner_rank === 1 ? '🥇' : entry.winner_rank === 2 ? '🥈' : '🥉'} Winner
                      </span>
                    )}
                  </div>
                  <div className="contest-entry-card__footer">
                    <span className="contest-vote-count" style={{ display:'flex', alignItems:'center', gap:'0.3rem' }}>
                      ❤️ {count} {count === 1 ? 'like' : 'likes'}
                    </span>
                    <button
                      className={`contest-vote-btn${isLiked ? ' contest-vote-btn--voted' : ''}`}
                      onClick={() => handleLike(entry.id)}
                      disabled={liking === entry.id}
                      style={{
                        background: isLiked ? 'rgba(239,68,68,0.15)' : undefined,
                        borderColor: isLiked ? 'rgba(239,68,68,0.4)' : undefined,
                        color: isLiked ? '#fca5a5' : undefined,
                      }}
                    >
                      {liking === entry.id ? '…' : isLiked ? '♥ Liked' : '♡ Like'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entries.length === 0 && !canSubmit && (
        <div className="ai-grid__empty">
          <p>No entries yet.</p>
        </div>
      )}
    </div>
  );
}
