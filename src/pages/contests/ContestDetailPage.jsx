import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isCreatorAdmin } from '../../lib/roles';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api.js';
import '../../styles/contests.css';
import '../../styles/portfolio.css';

export default function ContestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isAdmin = isCreatorAdmin(role);

  const [contest,       setContest]       = useState(null);
  const [entries,       setEntries]       = useState([]);
  const [winners,       setWinners]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  const [subTitle,    setSubTitle]    = useState('');
  const [subDesc,     setSubDesc]     = useState('');
  const [subFile,     setSubFile]     = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [subError,    setSubError]    = useState(null);
  const [subSuccess,  setSubSuccess]  = useState(false);
  const fileRef = useRef(null);

  const [likedEntries,   setLikedEntries]   = useState(new Set());
  const [liking,         setLiking]         = useState(null);
  const [markingWinner,  setMarkingWinner]  = useState(null);
  const [featuringEntry, setFeaturingEntry] = useState(null);
  const [payingOut,      setPayingOut]      = useState(false);
  const [payoutMsg,      setPayoutMsg]      = useState(null);

  // ── Pull Winners ──
  const [pullEventId,      setPullEventId]      = useState('');
  const [pullCount,        setPullCount]        = useState(1);
  const [pullPayouts,      setPullPayouts]      = useState([{ placeNumber: 1, payoutAmount: '' }]);
  const [pulling,          setPulling]          = useState(false);
  const [pullResult,       setPullResult]       = useState(null);
  const [pullError,        setPullError]        = useState(null);

  // ── Comments ──
  const [entryComments,    setEntryComments]    = useState({});   // { [entryId]: Comment[] }
  const [openComments,     setOpenComments]     = useState(new Set()); // which panels are open
  const [commentInputs,    setCommentInputs]    = useState({});   // { [entryId]: string }
  const [loadingComments,  setLoadingComments]  = useState(new Set());
  const [submittingComment, setSubmittingComment] = useState(null);
  const [deletingComment,  setDeletingComment]  = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // All public reads go through the API server (service role key — bypasses RLS)
      const json = await api(`/api/contests/${id}`);

      setContest(json.contest);
      setEntries(json.entries || []);
      setWinners(json.winners || []);

      // User-specific: which entries has this user already liked?
      // This uses the Supabase client with the user's JWT session.
      if (user && json.entries?.length > 0) {
        const entryIds = json.entries.map((e) => e.id);
        const { data: myLikes } = await supabase
          .from('likes')
          .select('entry_id')
          .eq('user_id', user.id)
          .in('entry_id', entryIds);
        if (myLikes) setLikedEntries(new Set(myLikes.map((r) => r.entry_id)));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id, user?.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user)            { setSubError('You must be logged in to submit.'); return; }
    if (!subTitle.trim()) { setSubError('Please enter a title.'); return; }

    setSubmitting(true);
    setSubError(null);
    try {
      let media_url = null;

      // 1. Upload file directly to Supabase storage (if provided)
      if (subFile) {
        const ext = subFile.name.split('.').pop();
        const filename = `${crypto.randomUUID()}.${ext}`;
        const storagePath = `contest-entries/${id}/${filename}`;

        const { error: uploadErr } = await supabase.storage
          .from('studio-flow-library')
          .upload(storagePath, subFile, { contentType: subFile.type, upsert: false });

        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

        const { data: urlData } = supabase.storage
          .from('studio-flow-library')
          .getPublicUrl(storagePath);
        media_url = urlData?.publicUrl || null;
      }

      // 2. Insert submission row directly via Supabase client
      const { error: insertErr } = await supabase.from('submissions').insert({
        contest_id:  id,
        user_id:     user.id,
        user_name:   user.user_metadata?.name || user.email?.split('@')[0] || 'Creator',
        user_email:  user.email,
        title:       subTitle.trim(),
        description: subDesc.trim() || null,
        media_url,
        video_url:   media_url,
        status:      'active',
      });

      if (insertErr) throw new Error(insertErr.message);

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
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('entry_id', entryId)
          .eq('user_id', user.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ entry_id: entryId, user_id: user.id });
        // Ignore unique-constraint errors (already liked)
        if (error && !error.message?.includes('unique') && error.code !== '23505') {
          throw new Error(error.message);
        }
      }

      // Optimistic UI — update liked set and re-sort by like_count
      setLikedEntries((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(entryId); else next.add(entryId);
        return next;
      });
      setEntries((prev) =>
        prev
          .map((e) => e.id === entryId
            ? { ...e, like_count: Math.max(0, (e.like_count || 0) + (isLiked ? -1 : 1)) }
            : e
          )
          .sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setLiking(null);
    }
  }

  // ── Comment helpers ──────────────────────────────────────────
  async function loadComments(entryId) {
    setLoadingComments((prev) => new Set([...prev, entryId]));
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('submission_id', entryId)
      .order('created_at', { ascending: true });
    setEntryComments((prev) => ({ ...prev, [entryId]: data || [] }));
    setLoadingComments((prev) => { const s = new Set(prev); s.delete(entryId); return s; });
  }

  function toggleComments(entryId) {
    setOpenComments((prev) => {
      const s = new Set(prev);
      if (s.has(entryId)) {
        s.delete(entryId);
      } else {
        s.add(entryId);
        if (!entryComments[entryId]) loadComments(entryId);
      }
      return s;
    });
  }

  async function handleComment(entryId) {
    const text = (commentInputs[entryId] || '').trim();
    if (!text || !user) return;
    setSubmittingComment(entryId);
    const { error } = await supabase.from('comments').insert({
      submission_id: entryId,
      user_id:       user.id,
      user_name:     user.user_metadata?.name || user.email?.split('@')[0] || 'Creator',
      user_email:    user.email,
      text,
    });
    if (!error) {
      setCommentInputs((prev) => ({ ...prev, [entryId]: '' }));
      loadComments(entryId);
    }
    setSubmittingComment(null);
  }

  async function handleDeleteComment(entryId, commentId) {
    if (!user) return;
    setDeletingComment(commentId);
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);
    if (!error) {
      setEntryComments((prev) => ({
        ...prev,
        [entryId]: (prev[entryId] || []).filter((c) => c.id !== commentId),
      }));
    }
    setDeletingComment(null);
  }
  // ─────────────────────────────────────────────────────────────

  async function handleMarkWinner(entry, rank) {
    setMarkingWinner(entry.id);
    try {
      const existingWinner = winners.find(w => w.submission_id === entry.id);
      const isAlreadyThisRank = existingWinner?.rank === rank;

      if (isAlreadyThisRank) {
        // Toggle off — remove from winners table
        await supabase
          .from('winners')
          .delete()
          .eq('contest_id', id)
          .eq('submission_id', entry.id);
      } else {
        // Remove any existing winner entry for this submission first
        await supabase
          .from('winners')
          .delete()
          .eq('contest_id', id)
          .eq('submission_id', entry.id);
        // Insert new winner row
        const { error: insertErr } = await supabase
          .from('winners')
          .insert({
            contest_id:   id,
            submission_id: entry.id,
            rank,
          });
        if (insertErr) throw new Error(insertErr.message);
      }

      // Optimistic UI update
      setWinners((prev) => {
        const filtered = prev.filter(w => w.submission_id !== entry.id);
        return isAlreadyThisRank ? filtered : [...filtered, { submission_id: entry.id, rank }];
      });
    } catch (err) {
      alert(`Winner update failed: ${err.message}`);
    } finally {
      setMarkingWinner(null);
    }
  }

  async function handleFeature(entry) {
    setFeaturingEntry(entry.id);
    const newFeatured = !entry.featured;
    try {
      const { error: featErr } = await supabase
        .from('submissions')
        .update({ featured: newFeatured })
        .eq('id', entry.id);
      if (featErr) throw new Error(featErr.message);
      setEntries((prev) =>
        prev.map(e => e.id === entry.id ? { ...e, featured: newFeatured } : e)
      );
    } catch (err) {
      alert(`Feature update failed: ${err.message}`);
    } finally {
      setFeaturingEntry(null);
    }
  }

  // ── Pull Winners handler ──────────────────────────────────────
  async function handlePullWinners(e) {
    e.preventDefault();
    if (!pullEventId.trim()) { setPullError('Event ID is required.'); return; }

    setPulling(true);
    setPullError(null);
    setPullResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const result = await api(`/api/contests/${id}/pull-winners`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId:        pullEventId.trim(),
          numberOfWinners: Number(pullCount),
          payouts:         pullPayouts.map((p) => ({
            placeNumber:  Number(p.placeNumber),
            payoutAmount: Number(p.payoutAmount) || 0,
          })),
        }),
      });
      setPullResult(result);
    } catch (err) {
      setPullError(err.message);
    } finally {
      setPulling(false);
    }
  }

  // Keep payouts array in sync with winner count
  function updatePullCount(n) {
    const num = Math.max(1, Math.min(Number(n) || 1, 20));
    setPullCount(num);
    setPullPayouts((prev) => {
      const next = [...prev];
      while (next.length < num) next.push({ placeNumber: next.length + 1, payoutAmount: '' });
      return next.slice(0, num);
    });
  }

  async function handlePayout() {
    if (!confirm('Trigger payout for all marked winners in this contest?')) return;
    setPayingOut(true);
    setPayoutMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const result = await api(`/api/contests/${id}/payout`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      setPayoutMsg(`✓ Payout triggered — ${result.winners ?? 0} winner(s), $${result.total ?? 0} distributed.`);
    } catch (err) {
      setPayoutMsg(`✗ Payout failed: ${err.message}`);
    } finally {
      setPayingOut(false);
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

  return (
    <div className="page-container">
      {contest.thumbnail_url && (
        <img src={contest.thumbnail_url} alt={contest.title} className="contest-detail__hero" />
      )}

      <h1 className="page-title">{contest.title}</h1>

      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', padding: '0.875rem 1rem', borderRadius: '10px', background: 'rgba(242,201,143,0.04)', border: '1px solid rgba(242,201,143,0.15)' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f2c98f', background: 'rgba(242,201,143,0.12)', border: '1px solid rgba(242,201,143,0.25)', borderRadius: '4px', padding: '0.2rem 0.55rem' }}>
            🛡 Admin
          </span>
          <span style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.5)', flex: 1, minWidth: '180px' }}>
            Click 🥇 🥈 🥉 to set winner ranks · ★ to feature a submission.
          </span>
          {contest?.prize_pool > 0 && (
            <button
              onClick={handlePayout}
              disabled={payingOut || winners.length === 0}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '7px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: (payingOut || winners.length === 0) ? 'not-allowed' : 'pointer',
                border: '1px solid rgba(134,239,172,0.3)',
                background: 'rgba(134,239,172,0.08)',
                color: '#86efac',
                opacity: (payingOut || winners.length === 0) ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              {payingOut ? 'Processing…' : `Payout Winners${winners.length > 0 ? ` (${winners.length})` : ''}`}
            </button>
          )}
          {payoutMsg && (
            <span style={{ fontSize: '0.78rem', color: payoutMsg.startsWith('✓') ? '#86efac' : '#fca5a5' }}>
              {payoutMsg}
            </span>
          )}
        </div>
      )}

      {/* ── Pull Winners Panel (admin only) ──────────────────── */}
      {isAdmin && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.25rem 1.5rem',
          borderRadius: '14px',
          background: 'rgba(139,92,246,0.04)',
          border: '1px solid rgba(139,92,246,0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c4b5fd', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '4px', padding: '0.2rem 0.55rem' }}>
              🎲 Pull Winners
            </span>
            <span style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.45)' }}>
              Randomly draw winners from ticket purchasers — repeat winners are automatically excluded.
            </span>
          </div>

          <form onSubmit={handlePullWinners} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {/* Event ID input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.45)', marginBottom: '0.35rem' }}>
                Event ID *
              </label>
              <input
                className="cinematic-input"
                style={{ maxWidth: '420px' }}
                placeholder="Paste the event UUID here"
                value={pullEventId}
                onChange={(e) => setPullEventId(e.target.value)}
                disabled={pulling}
              />
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: 'rgba(200,200,215,0.3)' }}>
                The event whose ticket purchases make up the draw pool.
              </p>
            </div>

            {/* Number of winners */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.45)', marginBottom: '0.35rem' }}>
                Number of Winners
              </label>
              <input
                type="number"
                className="cinematic-input"
                style={{ maxWidth: '120px' }}
                min="1" max="20"
                value={pullCount}
                onChange={(e) => updatePullCount(e.target.value)}
                disabled={pulling}
              />
            </div>

            {/* Per-place payout amounts */}
            {pullPayouts.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.45)', marginBottom: '0.5rem' }}>
                  Payout per Place (optional)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                  {pullPayouts.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(200,200,215,0.5)', minWidth: '28px' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.3)' }}>$</span>
                      <input
                        type="number"
                        className="cinematic-input"
                        style={{ width: '90px', padding: '0.35rem 0.65rem' }}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        value={p.payoutAmount}
                        onChange={(e) => {
                          const next = [...pullPayouts];
                          next[i] = { ...next[i], payoutAmount: e.target.value };
                          setPullPayouts(next);
                        }}
                        disabled={pulling}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {pullError && (
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#fca5a5' }}>✗ {pullError}</p>
            )}

            {/* Submit */}
            <div>
              <button
                type="submit"
                disabled={pulling || !pullEventId.trim()}
                style={{
                  padding: '0.55rem 1.35rem',
                  borderRadius: '9px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: (pulling || !pullEventId.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (pulling || !pullEventId.trim()) ? 0.5 : 1,
                  background: 'rgba(139,92,246,0.18)',
                  border: '1px solid rgba(139,92,246,0.4)',
                  color: '#c4b5fd',
                  transition: 'all 0.15s',
                }}
              >
                {pulling ? '🎲 Drawing…' : `🎲 Draw ${pullCount} Winner${pullCount > 1 ? 's' : ''}`}
              </button>
            </div>
          </form>

          {/* Results */}
          {pullResult && (
            <div style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', borderRadius: '10px', background: 'rgba(134,239,172,0.07)', border: '1px solid rgba(134,239,172,0.2)' }}>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', fontWeight: 700, color: '#86efac' }}>
                ✓ {pullResult.winners?.length ?? 0} winner{pullResult.winners?.length !== 1 ? 's' : ''} drawn from pool of {pullResult.poolSize} eligible participants
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(pullResult.winners || []).map((w) => (
                  <div key={w.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'rgba(220,220,235,0.85)' }}>
                    <span>{w.placeNumber === 1 ? '🥇' : w.placeNumber === 2 ? '🥈' : w.placeNumber === 3 ? '🥉' : `#${w.placeNumber}`}</span>
                    <span style={{ fontWeight: 600 }}>{w.username || w.email || w.userId}</span>
                    {w.payoutAmount > 0 && (
                      <span style={{ color: '#86efac', fontSize: '0.8rem' }}>${w.payoutAmount}</span>
                    )}
                    {w.email && w.username && (
                      <span style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.75rem' }}>{w.email}</span>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setPullResult(null)}
                style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(200,200,215,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

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
          <div className="contest-detail__stat-label">Submissions</div>
          <div className="contest-detail__stat-value">{entries.length}</div>
        </div>
        {contest.winner_count > 1 && (
          <div className="contest-detail__stat">
            <div className="contest-detail__stat-label">Winners</div>
            <div className="contest-detail__stat-value">Top {contest.winner_count}</div>
          </div>
        )}
        <div className="contest-detail__stat">
          <div className="contest-detail__stat-label">Status</div>
          <div className="contest-detail__stat-value" style={{ color: '#86efac', fontWeight: 700 }}>Always Open</div>
        </div>
      </div>

      {contest.description && (
        <p className="contest-detail__description">{contest.description}</p>
      )}

      {/* ── Submission Form ── */}
      {user && !subSuccess && (
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

      {!user && (
        <div style={{ padding:'1rem', borderRadius:'12px', background:'rgba(110,168,255,0.08)', border:'1px solid rgba(110,168,255,0.2)', color:'var(--accent-blue)', marginBottom:'1.5rem', textAlign:'center' }}>
          Log in to submit your entry.
        </div>
      )}

      {/* ── Submissions (sorted by likes) ── */}
      {entries.length > 0 && (
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">
            Submissions ({entries.length})
          </h2>
          <p style={{ fontSize:'0.82rem', color:'rgba(200,200,215,0.5)', marginBottom:'1rem' }}>
            Sorted by most liked. Winners are selected by the admin based on likes and quality.
          </p>
          <div className="contest-entries-grid">
            {entries.map((entry) => {
              const count        = entry.like_count || 0;
              const isLiked      = likedEntries.has(entry.id);
              const isBusy       = markingWinner === entry.id;
              const entryWinner  = winners.find(w => w.submission_id === entry.id);
              const isWinner     = !!entryWinner;
              const winnerRank   = entryWinner?.rank;
              const mediaUrl     = entry.media_url || entry.video_url;

              return (
                <div
                  key={entry.id}
                  className="contest-entry-card"
                  style={isWinner ? { border: '1px solid rgba(242,201,143,0.35)', background: 'rgba(242,201,143,0.04)' } : undefined}
                >
                  {mediaUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(mediaUrl) && (
                    <img src={mediaUrl} alt={entry.title} className="contest-entry-card__thumb" loading="lazy" />
                  )}
                  {mediaUrl && /\.(mp4|mov|webm)$/i.test(mediaUrl) && (
                    <video src={mediaUrl} className="contest-entry-card__thumb" controls preload="metadata" />
                  )}
                  <div className="contest-entry-card__body">
                    <h3 className="contest-entry-card__title">{entry.title}</h3>
                    {entry.description && (
                      <p className="contest-entry-card__desc">{entry.description}</p>
                    )}
                    {entry.user_name && (
                      <p style={{ fontSize:'0.75rem', color:'rgba(200,200,215,0.4)', margin:'0.25rem 0 0' }}>
                        by {entry.user_name}
                      </p>
                    )}
                    {isWinner && (
                      <span className="contest-winner-badge">
                        {winnerRank === 1 ? '🥇' : winnerRank === 2 ? '🥈' : '🥉'} Winner
                      </span>
                    )}

                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(200,200,215,0.35)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: '0.1rem' }}>Select winner</span>
                        {[1, 2, 3].map((rank) => {
                          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
                          const isSet = entryWinner?.rank === rank;
                          return (
                            <button
                              key={rank}
                              onClick={() => handleMarkWinner(entry, rank)}
                              disabled={isBusy}
                              style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                                border: isSet ? '1px solid rgba(242,201,143,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                background: isSet ? 'rgba(242,201,143,0.18)' : 'rgba(255,255,255,0.04)',
                                color: isSet ? '#f2c98f' : 'rgba(200,200,215,0.5)',
                                transition: 'all 0.15s',
                              }}
                              title={isSet ? `Remove ${medal} winner` : `Mark as ${medal} place`}
                            >
                              {isBusy ? '…' : medal}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => handleFeature(entry)}
                          disabled={featuringEntry === entry.id}
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: featuringEntry === entry.id ? 'not-allowed' : 'pointer',
                            border: entry.featured ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
                            background: entry.featured ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                            color: entry.featured ? '#c4b5fd' : 'rgba(200,200,215,0.45)',
                            transition: 'all 0.15s',
                          }}
                          title={entry.featured ? 'Remove featured status' : 'Feature this submission'}
                        >
                          {featuringEntry === entry.id ? '…' : entry.featured ? '★ Featured' : '☆ Feature'}
                        </button>
                        {isWinner && (
                          <button
                            onClick={() => handleMarkWinner(entry, winnerRank)}
                            disabled={isBusy}
                            style={{ padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', cursor: isBusy ? 'not-allowed' : 'pointer', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5', transition: 'all 0.15s' }}
                          >
                            ✕ Remove winner
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="contest-entry-card__footer">
                    <span className="contest-vote-count" style={{ display:'flex', alignItems:'center', gap:'0.3rem' }}>
                      ❤️ {count} {count === 1 ? 'like' : 'likes'}
                    </span>
                    <button
                      className="contest-comment-toggle"
                      onClick={() => toggleComments(entry.id)}
                    >
                      💬 {(entryComments[entry.id] || []).length > 0
                          ? `${(entryComments[entry.id] || []).length} comment${(entryComments[entry.id] || []).length !== 1 ? 's' : ''}`
                          : 'Comment'}
                    </button>
                    <button
                      className={`contest-vote-btn${isLiked ? ' contest-vote-btn--voted' : ''}`}
                      onClick={() => handleLike(entry.id)}
                      disabled={liking === entry.id}
                      style={{
                        background:  isLiked ? 'rgba(239,68,68,0.15)' : undefined,
                        borderColor: isLiked ? 'rgba(239,68,68,0.4)'  : undefined,
                        color:       isLiked ? '#fca5a5'               : undefined,
                      }}
                    >
                      {liking === entry.id ? '…' : isLiked ? '♥ Liked' : '♡ Like'}
                    </button>
                  </div>

                  {/* ── Comment panel ── */}
                  {openComments.has(entry.id) && (
                    <div className="contest-comments">
                      {loadingComments.has(entry.id) ? (
                        <p className="contest-comments__empty">Loading…</p>
                      ) : (entryComments[entry.id] || []).length === 0 ? (
                        <p className="contest-comments__empty">No comments yet. Be the first!</p>
                      ) : (
                        <div className="contest-comments__list">
                          {(entryComments[entry.id] || []).map((c) => (
                            <div key={c.id} className="contest-comment">
                              <div className="contest-comment__meta">
                                <span className="contest-comment__author">{c.user_name || 'Creator'}</span>
                                <span className="contest-comment__time">
                                  {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                {user?.id === c.user_id && (
                                  <button
                                    className="contest-comment__delete"
                                    onClick={() => handleDeleteComment(entry.id, c.id)}
                                    disabled={deletingComment === c.id}
                                    title="Delete comment"
                                  >
                                    {deletingComment === c.id ? '…' : '✕'}
                                  </button>
                                )}
                              </div>
                              <p className="contest-comment__text">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {user ? (
                        <div className="contest-comments__input-row">
                          <input
                            className="contest-comments__input"
                            placeholder="Add a comment…"
                            value={commentInputs[entry.id] || ''}
                            onChange={(e) => setCommentInputs((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(entry.id); } }}
                            disabled={submittingComment === entry.id}
                            maxLength={500}
                          />
                          <button
                            className="contest-comments__submit"
                            onClick={() => handleComment(entry.id)}
                            disabled={submittingComment === entry.id || !(commentInputs[entry.id] || '').trim()}
                          >
                            {submittingComment === entry.id ? '…' : 'Post'}
                          </button>
                        </div>
                      ) : (
                        <p className="contest-comments__empty" style={{ marginTop: '0.5rem' }}>
                          Log in to comment.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="ai-grid__empty">
          <p>No submissions yet. Be the first to enter!</p>
        </div>
      )}
    </div>
  );
}
