import { useState, useEffect } from 'react';
import { CONTESTS, calculatePayout, formatCountdown } from '../data.js';
import { supabase } from '../../../lib/supabase.js';
import { useAuth } from '../../../hooks/useAuth.js';

const ADMIN_EMAIL = 'obviouslyinspiredstudio@outlook.com';

function buildMailtoLink(contest, form) {
  const subject = encodeURIComponent(`[Studio Flow] Contest Submission: ${contest.title}`);
  const body = encodeURIComponent(
    `Contest: ${contest.title}\n\n` +
    `Name: ${form.name}\n` +
    `Email: ${form.email}\n` +
    `Content URL: ${form.contentUrl || 'N/A'}\n\n` +
    `Description:\n${form.description}\n\n` +
    `---\nSubmitted via Studio Flow`
  );
  return `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
}

function SubmissionModal({ contest, isMember, onClose, onSubmitted }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name:'', email: user?.email || '', contentUrl:'', description:'' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!isMember) {
    return (
      <div className="hub-modal-backdrop" onClick={onClose}>
        <div className="hub-modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="hub-modal__title">Members Only</h2>
          <div className="member-gate" style={{ margin:'1rem 0' }}>
            <p className="member-gate__text">A Studio Flow subscription is required to submit entries.</p>
            <button className="hub-btn hub-btn--gold" onClick={onClose}>Subscribe / Become a Member</button>
          </div>
          <div className="hub-modal__actions">
            <button className="hub-btn hub-btn--ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

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
    } catch (_) { /* table may not exist yet, still open mailto */ }

    // Open mailto link for email notification
    window.open(buildMailtoLink(contest, form), '_blank');
    setDone(true);
    setSubmitting(false);
    onSubmitted?.();
  }

  if (done) {
    return (
      <div className="hub-modal-backdrop" onClick={onClose}>
        <div className="hub-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>✅</div>
          <h2 className="hub-modal__title">Entry Submitted!</h2>
          <p className="hub-modal__sub">Your submission has been recorded and an email has been sent to the Studio Flow team. Good luck!</p>
          <button className="hub-btn hub-btn--gold" onClick={onClose} style={{ marginTop:'1rem' }}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="hub-modal-backdrop" onClick={onClose}>
      <div className="hub-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="hub-modal__title">Submit Entry — {contest.emoji} {contest.title}</h2>
        <p className="hub-modal__sub">Fill in your details below. Your entry will be reviewed by the Studio Flow team.</p>

        <div className="hub-form-group">
          <label className="hub-form-label">Your Name *</label>
          <input className="hub-form-input" value={form.name} onChange={set('name')} placeholder="Full name" />
        </div>
        <div className="hub-form-group">
          <label className="hub-form-label">Email *</label>
          <input className="hub-form-input" type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" />
        </div>
        <div className="hub-form-group">
          <label className="hub-form-label">Video / Content URL</label>
          <input className="hub-form-input" value={form.contentUrl} onChange={set('contentUrl')} placeholder="https://youtube.com/..." />
        </div>
        <div className="hub-form-group">
          <label className="hub-form-label">Description</label>
          <textarea className="hub-form-textarea" value={form.description} onChange={set('description')} placeholder="Tell us about your entry…" />
        </div>

        <div className="hub-form-note">
          📧 Your submission will be emailed to <strong>{ADMIN_EMAIL}</strong>
        </div>

        <div className="hub-modal__actions">
          <button className="hub-btn hub-btn--ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="hub-btn hub-btn--gold"
            onClick={handleSubmit}
            disabled={submitting || !form.name || !form.email}
          >
            {submitting ? 'Submitting…' : 'Submit Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContestCard({ contest, isMember }) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [votedIds, setVotedIds] = useState(new Set());
  const [voting, setVoting] = useState(null);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const revenue = submissions.length * contest.entryFee;
  const payouts = calculatePayout(revenue);

  async function loadSubmissions() {
    setLoadingSubs(true);
    try {
      const { data } = await supabase
        .from('hub_submissions')
        .select('*')
        .eq('contest_id', contest.id)
        .order('vote_count', { ascending: false });
      setSubmissions(data || []);

      if (user) {
        const { data: myVotes } = await supabase
          .from('hub_votes')
          .select('submission_id')
          .in('submission_id', (data || []).map((s) => s.id));
        setVotedIds(new Set((myVotes || []).map((v) => v.submission_id)));
      }
    } catch (_) {
      setSubmissions([]);
    } finally {
      setLoadingSubs(false);
    }
  }

  useEffect(() => {
    if (showSubmissions) loadSubmissions();
  }, [showSubmissions]);

  async function handleVote(subId) {
    if (!user || votedIds.has(subId) || voting) return;
    setVoting(subId);
    try {
      const { error } = await supabase.from('hub_votes').insert({ submission_id: subId, user_id: user.id });
      if (!error) {
        setVotedIds((prev) => new Set([...prev, subId]));
        setSubmissions((prev) =>
          prev.map((s) => s.id === subId ? { ...s, vote_count: (s.vote_count || 0) + 1 } : s)
        );
        // Also increment in db
        await supabase
          .from('hub_submissions')
          .update({ vote_count: (submissions.find((s) => s.id === subId)?.vote_count || 0) + 1 })
          .eq('id', subId);
      }
    } catch (_) {}
    setVoting(null);
  }

  return (
    <>
      <div className="contest-card-hub">
        {/* Header */}
        <div className="contest-card-hub__header" style={{ paddingTop:'1.25rem' }}>
          <span className="contest-card-hub__emoji">{contest.emoji}</span>
          <div className="contest-card-hub__meta">
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.3rem' }}>
              <p className="contest-card-hub__title" style={{ margin:0 }}>{contest.title}</p>
              <span className={`hub-badge hub-badge--${contest.status === 'active' ? 'open' : contest.status}`}>
                {contest.status === 'active' ? 'Open' : contest.status}
              </span>
            </div>
            <p className="contest-card-hub__desc">{contest.description}</p>
          </div>
        </div>

        {/* Body stats */}
        <div className="contest-card-hub__body">
          <div className="contest-card-hub__stat">
            <div className="contest-card-hub__stat-label">Entry Fee</div>
            <div className="contest-card-hub__stat-value">${contest.entryFee}</div>
          </div>
          <div className="contest-card-hub__stat">
            <div className="contest-card-hub__stat-label">Revenue</div>
            <div className="contest-card-hub__stat-value">${revenue.toFixed(0)}</div>
          </div>
          <div className="contest-card-hub__stat">
            <div className="contest-card-hub__stat-label">Submissions</div>
            <div className="contest-card-hub__stat-value">{submissions.length}</div>
          </div>
          <div className="contest-card-hub__stat">
            <div className="contest-card-hub__stat-label">Deadline</div>
            <div className="contest-card-hub__countdown">{formatCountdown(contest.deadline)}</div>
          </div>
        </div>

        {/* Prize pool payout */}
        <div className="payout-section">
          <div className="payout-section__title">
            💰 Prize Pool — ${revenue.toFixed(0)} ({
              revenue < 500 ? '1 winner' : revenue <= 2000 ? '2 winners' : '3 winners'
            })
          </div>
          {payouts.map((p) => (
            <div key={p.rank} className="payout-row">
              <span className="payout-rank">{p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'}</span>
              <div className="payout-bar-track">
                <div className="payout-bar-fill" style={{ width: `${p.pct}%` }} />
              </div>
              <span className="payout-amount">${p.amount.toFixed(0)}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="contest-card-hub__actions">
          <button
            className="hub-btn hub-btn--gold"
            onClick={() => setShowModal(true)}
          >
            Submit Entry
          </button>
          <button
            className="hub-btn hub-btn--ghost"
            onClick={() => setShowSubmissions((v) => !v)}
          >
            {showSubmissions ? 'Hide' : 'View'} Submissions ({submissions.length})
          </button>
        </div>

        {/* Submissions expandable */}
        {showSubmissions && (
          <div className="submissions-panel">
            {loadingSubs && (
              <div style={{ padding:'1rem', textAlign:'center' }}>
                <div className="cinematic-spinner" style={{ width:'1.5rem', height:'1.5rem', margin:'0 auto' }} />
              </div>
            )}
            {!loadingSubs && submissions.length === 0 && (
              <div style={{ padding:'1rem 1.25rem', color:'var(--hub-muted)', fontSize:'0.85rem', textAlign:'center' }}>
                No submissions yet — be the first!
              </div>
            )}
            {!loadingSubs && submissions.map((sub, i) => (
              <div key={sub.id} className="submission-item" style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                <div style={{ width:'24px', textAlign:'center', fontSize:'0.85rem', color:'var(--hub-muted)', flexShrink:0 }}>
                  #{i + 1}
                </div>
                <div className="submission-item__body">
                  <p className="submission-item__name">{sub.name}</p>
                  {sub.description && <p className="submission-item__desc">{sub.description}</p>}
                  {sub.content_url && (
                    <a href={sub.content_url} target="_blank" rel="noopener noreferrer" className="submission-item__link">
                      View Content →
                    </a>
                  )}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.25rem', flexShrink:0 }}>
                  <button
                    className={`vote-btn-hub${votedIds.has(sub.id) ? ' vote-btn-hub--voted' : ''}`}
                    onClick={() => handleVote(sub.id)}
                    disabled={!user || votedIds.has(sub.id) || voting === sub.id}
                    title={!user ? 'Log in to vote' : votedIds.has(sub.id) ? 'Already voted' : 'Upvote'}
                  >
                    {votedIds.has(sub.id) ? '✓' : '▲'} {sub.vote_count || 0}
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
          isMember={isMember}
          onClose={() => setShowModal(false)}
          onSubmitted={loadSubmissions}
        />
      )}
    </>
  );
}

export default function ContestsTab({ isMember }) {
  return (
    <div className="hub-content">
      <div className="page-header" style={{ marginBottom:'1.5rem' }}>
        <h1 className="hub-section-title" style={{ fontSize:'1.6rem' }}>🏆 Contests</h1>
        <p style={{ color:'var(--hub-muted)', fontSize:'0.9rem', margin:0 }}>
          Submit your work, vote for your favorites, and win real cash prizes.
        </p>
      </div>

      {!isMember && (
        <div className="member-gate" style={{ marginBottom:'1.5rem' }}>
          <p className="member-gate__text">
            A Studio Flow subscription is required to submit contest entries and vote.
          </p>
          <span style={{ fontSize:'0.8rem', color:'var(--hub-muted)' }}>
            You can still browse submissions without a membership.
          </span>
        </div>
      )}

      <div className="hub-contests-grid">
        {CONTESTS.map((c) => (
          <ContestCard key={c.id} contest={c} isMember={isMember} />
        ))}
      </div>
    </div>
  );
}
