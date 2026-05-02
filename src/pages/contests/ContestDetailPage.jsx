import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import '../../styles/contests.css';
import '../../styles/portfolio.css';

function statusWindow(contest) {
  const now = new Date();
  const subStart = contest.submission_start ? new Date(contest.submission_start) : null;
  const subEnd   = contest.submission_end   ? new Date(contest.submission_end)   : null;
  const voteStart = contest.voting_start   ? new Date(contest.voting_start)      : null;
  const voteEnd   = contest.voting_end     ? new Date(contest.voting_end)        : null;

  const canSubmit = (!subStart || now >= subStart) && (!subEnd || now <= subEnd);
  const canVote   = (!voteStart || now >= voteStart) && (!voteEnd || now <= voteEnd);
  return { canSubmit, canVote };
}

export default function ContestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contest,  setContest]  = useState(null);
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // submission form
  const [subTitle, setSubTitle] = useState('');
  const [subDesc,  setSubDesc]  = useState('');
  const [subFile,  setSubFile]  = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [subError,   setSubError]   = useState(null);
  const [subSuccess, setSubSuccess] = useState(false);
  const fileRef = useRef(null);

  // voting state
  const [votedEntries, setVotedEntries] = useState(new Set());
  const [voting, setVoting] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contests/${id}`);
      if (!res.ok) throw new Error('Contest not found.');
      const { contest: c, entries: e } = await res.json();
      setContest(c);
      setEntries(e);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  // Check which entries the user already voted for
  useEffect(() => {
    if (!user || entries.length === 0) return;
    supabase
      .from('contest_votes')
      .select('entry_id')
      .eq('contest_id', id)
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setVotedEntries(new Set(data.map((v) => v.entry_id)));
      });
  }, [user, entries, id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) { setSubError('You must be logged in to submit.'); return; }
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

  async function handleVote(entryId) {
    if (!user) { alert('You must be logged in to vote.'); return; }
    setVoting(entryId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/contests/${id}/entries/${entryId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Vote failed.');
      setVotedEntries((prev) => new Set([...prev, entryId]));
      setEntries((prev) =>
        prev.map((e) => e.id === entryId ? { ...e, vote_count: (e.vote_count || 0) + 1 } : e)
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setVoting(null);
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

  const { canSubmit, canVote } = statusWindow(contest);
  const isCompleted = contest.status === 'completed';

  return (
    <div className="page-container">
      {/* Hero image */}
      {contest.thumbnail_url && (
        <img src={contest.thumbnail_url} alt={contest.title} className="contest-detail__hero" />
      )}

      {/* Title + meta */}
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

      {/* ── Entries ── */}
      {entries.length > 0 && (
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">
            {isCompleted ? '🥇 Results' : `Entries (${entries.length})`}
          </h2>
          <div className="contest-entries-grid">
            {entries.map((entry) => (
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
                  <span className="contest-vote-count">
                    {entry.vote_count || 0} vote{entry.vote_count !== 1 ? 's' : ''}
                  </span>
                  {canVote && (
                    <button
                      className="contest-vote-btn"
                      onClick={() => handleVote(entry.id)}
                      disabled={votedEntries.has(entry.id) || voting === entry.id}
                    >
                      {votedEntries.has(entry.id) ? '✓ Voted' : voting === entry.id ? '…' : '▲ Vote'}
                    </button>
                  )}
                </div>
              </div>
            ))}
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
