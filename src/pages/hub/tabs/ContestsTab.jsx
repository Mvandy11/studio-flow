import { useState, useEffect } from 'react';
import { CONTESTS, calculatePayout, formatCountdown } from '../data.js';
import { supabase } from '../../../lib/supabase.js';
import { useAuth } from '../../../hooks/useAuth.js';
import { buildStripeUrl, saveTicketIntent } from '../../../lib/stripeLinks.js';

const ADMIN_EMAIL = 'obviouslyinspiredstudio@outlook.com';

function buildMailtoLink(contest, form) {
  const subject = encodeURIComponent(`[Studio Flow] Contest Entry: ${contest.title}`);
  const body = encodeURIComponent(
    `Contest: ${contest.title}\n\n` +
    `Name: ${form.name}\n` +
    `Email: ${form.email}\n` +
    `Content URL: ${form.contentUrl || 'N/A'}\n\n` +
    `Description:\n${form.description}\n\n` +
    `---\nSubmitted via Studio Flow (FREE with membership)`
  );
  return `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
}

/* ── Submission modal (entry is FREE for members) ─────────── */
function SubmissionModal({ contest, isMember, onClose, onSubmitted }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: user?.email || '', contentUrl: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!isMember) {
    return (
      <div className="hub-modal-backdrop" onClick={onClose}>
        <div className="hub-modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="hub-modal__title">Members Only</h2>
          <div className="member-gate" style={{ margin: '1rem 0' }}>
            <p className="member-gate__text">
              A Studio Flow subscription is required to submit entries. Entries are <strong style={{ color:'var(--hub-green)' }}>FREE</strong> for all members.
            </p>
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
    } catch (_) { /* graceful — still send mailto */ }

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
          <h2 className="hub-modal__title">Entry Submitted — Free!</h2>
          <p className="hub-modal__sub">
            Your entry is recorded and emailed to the Studio Flow team. Good luck!
          </p>
          <button className="hub-btn hub-btn--gold" onClick={onClose} style={{ marginTop: '1rem' }}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="hub-modal-backdrop" onClick={onClose}>
      <div className="hub-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.25rem' }}>
          <h2 className="hub-modal__title" style={{ margin:0 }}>Submit Entry — {contest.emoji} {contest.title}</h2>
          <span className="hub-badge hub-badge--active" style={{ flexShrink:0 }}>FREE</span>
        </div>
        <p className="hub-modal__sub">
          Entry is free with your Studio Flow membership. Fill in your details below.
        </p>

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
            {submitting ? 'Submitting…' : 'Submit Entry — FREE'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Contest card ─────────────────────────────────────────── */
function ContestCard({ contest, isMember }) {
  const { user } = useAuth();

  const [submissions,   setSubmissions]   = useState([]);
  const [showSubs,      setShowSubs]      = useState(false);
  const [showModal,     setShowModal]     = useState(false);
  const [votedIds,      setVotedIds]      = useState(new Set());
  const [voting,        setVoting]        = useState(null);
  const [loadingSubs,   setLoadingSubs]   = useState(false);
  const [hasVotingTkt,  setHasVotingTkt]  = useState(false);
  const [buyingTicket,  setBuyingTicket]  = useState(false);
  const [voteTicketCount, setVoteTicketCount] = useState(0); // total sold → prize pool

  // Revenue comes from voting tickets sold × price
  const revenue = voteTicketCount * contest.votingTicketPrice;
  const payouts = calculatePayout(revenue);

  async function loadContestData() {
    try {
      // Count voting tickets sold for this contest (prize pool source)
      const { count } = await supabase
        .from('hub_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', contest.id)
        .eq('ticket_type', 'voting');
      setVoteTicketCount(count || 0);

      // Check if current user already has a voting ticket
      if (user) {
        const { data: myTkt } = await supabase
          .from('hub_tickets')
          .select('id')
          .eq('event_id', contest.id)
          .eq('ticket_type', 'voting')
          .eq('user_id', user.id)
          .maybeSingle();
        setHasVotingTkt(!!myTkt);
      }
    } catch (_) {}
  }

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
        const { data: myVotes } = await supabase
          .from('hub_votes')
          .select('submission_id')
          .in('submission_id', data.map((s) => s.id));
        setVotedIds(new Set((myVotes || []).map((v) => v.submission_id)));
      }
    } catch (_) {
      setSubmissions([]);
    }
    setLoadingSubs(false);
  }

  useEffect(() => { loadContestData(); }, [user]);

  useEffect(() => {
    if (showSubs && hasVotingTkt) loadSubmissions();
  }, [showSubs, hasVotingTkt]);

  function handleBuyVotingTicket() {
    if (!user) { alert('Log in to purchase a viewing + voting ticket.'); return; }
    if (!isMember) { alert('A Studio Flow membership is required.'); return; }

    // Save intent — Success page will insert the ticket and free companion
    saveTicketIntent({
      userId:     user.id,
      eventId:    contest.id,
      eventTitle: contest.title,
      ticketType: 'voting',          // paid ticket → unlocks view + vote
      amount:     contest.votingTicketPrice,
      category:   'contest',
    });

    // Build compact Stripe reference: "ct_{contestId}_{shortUserId}"
    const ref = `ct_${contest.id}_${user.id.slice(0, 8)}`;

    const stripeUrl = buildStripeUrl(contest.votingTicketPrice, {
      email:             user.email,
      clientReferenceId: ref,
    });
    window.location.href = stripeUrl;
  }

  async function handleVote(subId) {
    if (!user || !hasVotingTkt || votedIds.has(subId) || voting) return;
    setVoting(subId);
    try {
      const { error } = await supabase
        .from('hub_votes')
        .insert({ submission_id: subId, user_id: user.id });
      if (!error) {
        setVotedIds((prev) => new Set([...prev, subId]));
        const currentCount = submissions.find((s) => s.id === subId)?.vote_count || 0;
        setSubmissions((prev) =>
          prev.map((s) => s.id === subId ? { ...s, vote_count: currentCount + 1 } : s)
        );
        await supabase
          .from('hub_submissions')
          .update({ vote_count: currentCount + 1 })
          .eq('id', subId);
      }
    } catch (_) {}
    setVoting(null);
  }

  return (
    <>
      <div className="contest-card-hub">
        {/* Header */}
        <div className="contest-card-hub__header" style={{ paddingTop: '1.25rem' }}>
          <span className="contest-card-hub__emoji">{contest.emoji}</span>
          <div className="contest-card-hub__meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
              <p className="contest-card-hub__title" style={{ margin: 0 }}>{contest.title}</p>
              <span className={`hub-badge hub-badge--${contest.status === 'active' ? 'open' : contest.status}`}>
                {contest.status === 'active' ? 'Open' : contest.status}
              </span>
            </div>
            <p className="contest-card-hub__desc">{contest.description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="contest-card-hub__body">
          <div className="contest-card-hub__stat">
            <div className="contest-card-hub__stat-label">Entry</div>
            <div className="contest-card-hub__stat-value" style={{ color: 'var(--hub-green)' }}>FREE</div>
          </div>
          <div className="contest-card-hub__stat">
            <div className="contest-card-hub__stat-label">View &amp; Vote</div>
            <div className="contest-card-hub__stat-value">${contest.votingTicketPrice}</div>
          </div>
          <div className="contest-card-hub__stat">
            <div className="contest-card-hub__stat-label">Voters</div>
            <div className="contest-card-hub__stat-value">{voteTicketCount}</div>
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

        {/* Prize pool */}
        <div className="payout-section">
          <div className="payout-section__title">
            💰 Prize Pool — ${revenue.toFixed(0)} from {voteTicketCount} voting ticket{voteTicketCount !== 1 ? 's' : ''} ({
              revenue < 500 ? '1 winner' : revenue <= 2000 ? '2 winners' : '3 winners'
            })
          </div>
          {revenue === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--hub-muted)', margin: '0.25rem 0 0' }}>
              Prize pool grows as voting tickets are sold.
            </p>
          ) : payouts.map((p) => (
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
        <div className="contest-card-hub__actions" style={{ flexWrap: 'wrap', gap: '0.625rem' }}>
          {/* Free entry button */}
          <button className="hub-btn hub-btn--green" onClick={() => setShowModal(true)}>
            ✏ Submit Entry — FREE
          </button>

          {/* Voting ticket / view submissions */}
          {hasVotingTkt ? (
            <button
              className="hub-btn hub-btn--blue"
              onClick={() => setShowSubs((v) => !v)}
            >
              🗳 {showSubs ? 'Hide' : 'View'} &amp; Vote ({submissions.length})
            </button>
          ) : (
            <button
              className="hub-btn hub-btn--gold"
              onClick={handleBuyVotingTicket}
              disabled={buyingTicket}
            >
              {buyingTicket ? 'Processing…' : `🎟 Buy Viewing + Voting Ticket — $${contest.votingTicketPrice}`}
            </button>
          )}
        </div>

        {/* Gate message if no ticket */}
        {showSubs && !hasVotingTkt && (
          <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--hub-border)', background: 'rgba(245,166,35,0.04)' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--hub-muted)' }}>
              🔒 Purchase a ${contest.votingTicketPrice} viewing + voting ticket to watch submissions and cast your vote.
            </p>
          </div>
        )}

        {/* Submissions panel — only shown to ticket holders */}
        {showSubs && hasVotingTkt && (
          <div className="submissions-panel">
            {loadingSubs && (
              <div style={{ padding: '1.25rem', textAlign: 'center' }}>
                <div className="cinematic-spinner" style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto' }} />
              </div>
            )}
            {!loadingSubs && submissions.length === 0 && (
              <div style={{ padding: '1rem 1.25rem', color: 'var(--hub-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                No submissions yet — be the first to enter!
              </div>
            )}
            {!loadingSubs && submissions.length > 0 && (
              <div style={{ padding: '0.625rem 1.25rem 0.375rem', fontSize: '0.75rem', color: 'var(--hub-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✅ You have a voting ticket — cast your vote below</span>
                <span style={{ marginLeft: 'auto' }}>One vote per submission</span>
              </div>
            )}
            {!loadingSubs && submissions.map((sub, i) => (
              <div
                key={sub.id}
                className="submission-item"
                style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}
              >
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
                    className={`vote-btn-hub${votedIds.has(sub.id) ? ' vote-btn-hub--voted' : ''}`}
                    onClick={() => handleVote(sub.id)}
                    disabled={votedIds.has(sub.id) || voting === sub.id}
                    title={votedIds.has(sub.id) ? 'Already voted' : 'Cast your vote'}
                  >
                    {votedIds.has(sub.id) ? '✓ Voted' : '▲ Vote'} · {sub.vote_count || 0}
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

/* ── Contests tab ─────────────────────────────────────────── */
export default function ContestsTab({ isMember }) {
  return (
    <div className="hub-content">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="hub-section-title" style={{ fontSize: '1.6rem' }}>🏆 Contests</h1>
        <p style={{ color: 'var(--hub-muted)', fontSize: '0.9rem', margin: 0 }}>
          Entering is free with your membership. Buy a $5 viewing + voting ticket to watch submissions and vote.
        </p>
      </div>

      {/* How it works */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
        {[
          { icon: '✏', label: 'Submit Entry', detail: 'FREE for members', color: 'var(--hub-green)' },
          { icon: '🎟', label: 'Viewing + Voting Ticket', detail: '$5 per contest', color: 'var(--hub-gold)' },
          { icon: '🗳', label: 'Watch & Vote', detail: 'Ticket holders only', color: 'var(--hub-blue)' },
          { icon: '💰', label: 'Prize Pool', detail: 'Grows with every ticket sold', color: 'var(--hub-orange)' },
        ].map((step) => (
          <div key={step.label} style={{ background: 'var(--hub-card)', border: '1px solid var(--hub-border)', borderRadius: '12px', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>{step.icon}</span>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: step.color }}>{step.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--hub-muted)' }}>{step.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {!isMember && (
        <div className="member-gate" style={{ marginBottom: '1.5rem' }}>
          <p className="member-gate__text">
            A Studio Flow subscription is required to submit entries (free) and purchase voting tickets.
          </p>
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
