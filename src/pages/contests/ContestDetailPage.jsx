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
  const [pullPayouts,      setPullPayouts]      = useState([{ placeNumber: 1, payoutAmount: 100 }]);
  const [pulling,          setPulling]          = useState(false);
  const [pullResult,       setPullResult]       = useState(null);
  const [pullError,        setPullError]        = useState(null);

  // ── Winner History ──
  const [winnerHistory,       setWinnerHistory]       = useState([]);
  const [winnerHistoryLoading, setWinnerHistoryLoading] = useState(false);

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

  // ── Load winner history (admin only) ──────────────────────────
  async function loadWinnerHistory() {
    if (!id) return;
    setWinnerHistoryLoading(true);
    try {
      const { data, error: hErr } = await supabase
        .from('winner_history')
        .select('id, place_number, payout_amount, created_at, user_id, profiles(username, display_name)')
        .eq('contest_id', id)
        .order('place_number', { ascending: true });

      if (!hErr && data) {
        setWinnerHistory(data);
      }
    } catch (_) {
      // table may not exist yet — stay silent
    } finally {
      setWinnerHistoryLoading(false);
    }
  }

  useEffect(() => { if (isAdmin) loadWinnerHistory(); }, [id, isAdmin]);

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
          eventId:         pullEventId.trim(),
          numberOfWinners: Number(pullCount),
          payouts:         pullPayouts.map((p) => ({
            placeNumber:  Number(p.placeNumber),
            payoutAmount: Number(p.payoutAmount) || 0,
          })),
        }),
      });
      setPullResult({ ...result, requested: Number(pullCount) });
      // Refresh history panel after a successful draw
      loadWinnerHistory();
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Admin access required') || msg.includes('403')) {
        setPullError('You must be an admin to pull winners.');
      } else if (msg.includes('No eligible')) {
        setPullError('No eligible users remaining. All possible winners have already won before.');
      } else {
        setPullError(msg);
      }
    } finally {
      setPulling(false);
    }
  }

  // Smart defaults: 1st→$100, 2nd→$50, 3rd→$25, rest→$0
  const DEFAULT_PAYOUTS = [100, 50, 25];
  function defaultAmount(i) { return DEFAULT_PAYOUTS[i] ?? 0; }

  // Keep payouts array in sync with winner count, applying smart defaults for new rows
  function updatePullCount(n) {
    const num = Math.max(1, Math.min(Number(n) || 1, 20));
    setPullCount(num);
    setPullPayouts((prev) => {
      const next = prev.slice(0, num);
      while (next.length < num) {
        const i = next.length;
        next.push({ placeNumber: i + 1, payoutAmount: defaultAmount(i) });
      }
      return next;
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

      {/* ── Winner Control Panel (admin only) ──────────────────── */}
      {isAdmin && (
        <div style={{ marginBottom: '1.5rem', borderRadius: '14px', border: '1px solid rgba(139,92,246,0.2)', overflow: 'hidden' }}>

          {/* ── Section header ── */}
          <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(139,92,246,0.1)', borderBottom: '1px solid rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c4b5fd', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)', borderRadius: '4px', padding: '0.2rem 0.55rem' }}>
              🎲 Winner Control
            </span>
            <span style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.4)' }}>
              Admin only — draws are random, repeat winners automatically excluded
            </span>
          </div>

          {/* ── Winner Settings form ── */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
            <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.35)' }}>
              Winner Settings
            </p>

            <form onSubmit={handlePullWinners} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Event ID */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.45)', marginBottom: '0.35rem' }}>
                  Event ID *
                </label>
                <input
                  className="cinematic-input"
                  style={{ maxWidth: '440px', width: '100%' }}
                  placeholder="Paste the event UUID here"
                  value={pullEventId}
                  onChange={(e) => setPullEventId(e.target.value)}
                  disabled={pulling}
                />
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: 'rgba(200,200,215,0.28)' }}>
                  The event whose ticket purchases form the draw pool.
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
                  style={{ maxWidth: '110px' }}
                  min="1" max="20"
                  value={pullCount}
                  onChange={(e) => updatePullCount(e.target.value)}
                  disabled={pulling}
                />
              </div>

              {/* Per-place payout grid */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.45)', marginBottom: '0.6rem' }}>
                  Payout per Place
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '0.6rem' }}>
                  {pullPayouts.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.45rem 0.7rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '1rem', minWidth: '22px', textAlign: 'center' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.4)' }}>#{i+1}</span>}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(200,200,215,0.3)', flexShrink: 0 }}>$</span>
                      <input
                        type="number"
                        className="cinematic-input"
                        style={{ flex: 1, minWidth: 0, padding: '0.3rem 0.5rem', fontSize: '0.875rem' }}
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
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.72rem', color: 'rgba(200,200,215,0.25)' }}>
                  Defaults: 1st $100 · 2nd $50 · 3rd $25. Edit any amount before drawing.
                </p>
              </div>

              {/* Error banner */}
              {pullError && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.65rem 0.9rem', borderRadius: '8px', background: 'rgba(252,165,165,0.08)', border: '1px solid rgba(252,165,165,0.2)' }}>
                  <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>⚠️</span>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#fca5a5', lineHeight: 1.45 }}>{pullError}</p>
                </div>
              )}

              {/* Submit row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="submit"
                  disabled={pulling || !pullEventId.trim()}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '9px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: (pulling || !pullEventId.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (pulling || !pullEventId.trim()) ? 0.5 : 1,
                    background: 'rgba(139,92,246,0.2)',
                    border: '1px solid rgba(139,92,246,0.45)',
                    color: '#c4b5fd',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                >
                  {pulling ? '🎲 Drawing…' : `🎲 Generate ${pullCount} Winner${pullCount > 1 ? 's' : ''}`}
                </button>
                {pulling && (
                  <span style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.35)' }}>
                    Selecting from eligible pool…
                  </span>
                )}
              </div>
            </form>

            {/* Draw results */}
            {pullResult && (
              <div style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', borderRadius: '10px', background: 'rgba(134,239,172,0.06)', border: '1px solid rgba(134,239,172,0.18)' }}>
                {/* Partial draw warning */}
                {pullResult.requested > (pullResult.winners?.length ?? 0) && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.55rem 0.8rem', borderRadius: '7px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <span style={{ flexShrink: 0 }}>⚠️</span>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#fcd34d', lineHeight: 1.45 }}>
                      Partial draw — requested {pullResult.requested} but only {pullResult.winners?.length ?? 0} eligible participant{pullResult.winners?.length !== 1 ? 's' : ''} remained.
                      {pullResult.winners?.length === 0 && ' All ticket holders have already won before.'}
                    </p>
                  </div>
                )}

                <p style={{ margin: '0 0 0.8rem', fontSize: '0.82rem', fontWeight: 700, color: '#86efac' }}>
                  ✓ {pullResult.winners?.length ?? 0} winner{pullResult.winners?.length !== 1 ? 's' : ''} drawn
                  {pullResult.poolSize != null ? ` from pool of ${pullResult.poolSize} eligible participants` : ''}
                </p>

                {/* Winners table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {(pullResult.winners || []).map((w) => (
                    <div key={w.userId} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                      <span style={{ textAlign: 'center' }}>
                        {w.placeNumber === 1 ? '🥇' : w.placeNumber === 2 ? '🥈' : w.placeNumber === 3 ? '🥉' : <span style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.75rem' }}>#{w.placeNumber}</span>}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, color: 'rgba(220,220,235,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {w.username || w.email || w.userId}
                        </p>
                        {w.email && w.username && (
                          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(200,200,215,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.email}</p>
                        )}
                      </div>
                      {w.payoutAmount > 0 && (
                        <span style={{ fontWeight: 700, color: '#86efac', fontSize: '0.875rem', flexShrink: 0 }}>${Number(w.payoutAmount).toLocaleString()}</span>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setPullResult(null)}
                  style={{ marginTop: '0.8rem', fontSize: '0.72rem', color: 'rgba(200,200,215,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* ── Winner History ── */}
          <div style={{ padding: '1.1rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.35)' }}>
                Winner History
              </p>
              <button
                onClick={loadWinnerHistory}
                disabled={winnerHistoryLoading}
                style={{ fontSize: '0.72rem', color: 'rgba(200,200,215,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: winnerHistoryLoading ? 0.5 : 1 }}
              >
                {winnerHistoryLoading ? 'Loading…' : '↻ Refresh'}
              </button>
            </div>

            {winnerHistoryLoading && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div className="cinematic-spinner" style={{ width: '22px', height: '22px', margin: '0 auto' }} />
              </div>
            )}

            {!winnerHistoryLoading && winnerHistory.length === 0 && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(200,200,215,0.25)', fontStyle: 'italic' }}>
                No winners drawn yet for this contest.
              </p>
            )}

            {!winnerHistoryLoading && winnerHistory.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Place', 'Winner', 'Payout', 'Drawn At'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.35rem 0.6rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.3)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {winnerHistory.map((row) => {
                      const profile = row.profiles;
                      const displayName = profile?.display_name || profile?.username || row.user_id;
                      const medal = row.place_number === 1 ? '🥇' : row.place_number === 2 ? '🥈' : row.place_number === 3 ? '🥉' : `#${row.place_number}`;
                      const drawnAt = row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                      return (
                        <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '0.5rem 0.6rem', color: 'rgba(220,220,235,0.7)' }}>{medal}</td>
                          <td style={{ padding: '0.5rem 0.6rem', color: 'rgba(220,220,235,0.85)', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</td>
                          <td style={{ padding: '0.5rem 0.6rem', color: row.payout_amount > 0 ? '#86efac' : 'rgba(200,200,215,0.35)', fontWeight: row.payout_amount > 0 ? 600 : 400 }}>
                            {row.payout_amount > 0 ? `$${Number(row.payout_amount).toLocaleString()}` : '—'}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', color: 'rgba(200,200,215,0.35)', whiteSpace: 'nowrap' }}>{drawnAt}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

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
