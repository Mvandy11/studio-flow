import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isCreatorAdmin } from '../../lib/roles';
import { supabase } from '../../lib/supabase';
import '../../styles/contests.css';

export default function CreateContestPage() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title:            '',
    description:      '',
    thumbnail_url:    '',
    prize_pool:       '',
    entry_fee:        '0',
    winner_count:     '1',
    status:           'draft',
    submission_start: '',
    submission_end:   '',
    voting_start:     '',
    voting_end:       '',
    start_date:       '',
    end_date:         '',
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (authLoading) return <div className="page-container"><div className="cinematic-spinner" /></div>;

  if (!isCreatorAdmin(role)) {
    return (
      <div className="page-container" style={{ textAlign:'center', paddingTop:'4rem' }}>
        <p style={{ color:'#fca5a5' }}>Admin access required.</p>
        <button className="cinematic-button" onClick={() => navigate('/contests')}>Back</button>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          prize_pool:   Number(form.prize_pool)   || 0,
          entry_fee:    Number(form.entry_fee)    || 0,
          winner_count: Number(form.winner_count) || 1,
          submission_start: form.submission_start || null,
          submission_end:   form.submission_end   || null,
          voting_start:     form.voting_start     || null,
          voting_end:       form.voting_end       || null,
          start_date:       form.start_date       || null,
          end_date:         form.end_date         || null,
          thumbnail_url:    form.thumbnail_url    || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create contest.');
      navigate(`/contests/${json.contest.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container page-container--narrow">
      <div className="page-header">
        <h1 className="page-title">Create Contest</h1>
        <p className="page-subtitle">Set up a new contest for the Studio Flow community.</p>
      </div>

      {error && (
        <div style={{ padding:'0.75rem 1rem', borderRadius:'10px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', marginBottom:'1.25rem' }}>
          {error}
        </div>
      )}

      <form className="create-contest-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="form-input" value={form.title} onChange={set('title')} placeholder="Contest title" required />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="Describe the contest, rules, and prizes…" rows={4} />
        </div>

        <div className="form-group">
          <label className="form-label">Thumbnail URL</label>
          <input className="form-input" value={form.thumbnail_url} onChange={set('thumbnail_url')} placeholder="https://…" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Prize Pool ($)</label>
            <input className="form-input" type="number" min="0" value={form.prize_pool} onChange={set('prize_pool')} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Entry Fee ($)</label>
            <input className="form-input" type="number" min="0" value={form.entry_fee} onChange={set('entry_fee')} placeholder="0" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Number of Winners</label>
            <select className="form-select" value={form.winner_count} onChange={set('winner_count')}>
              <option value="1">1 Winner</option>
              <option value="2">2 Winners</option>
              <option value="3">3 Winners</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={set('status')}>
              <option value="draft">Draft</option>
              <option value="active">Active (Open)</option>
              <option value="voting">Voting</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'1.25rem' }}>
          <p className="form-label" style={{ marginBottom:'0.75rem' }}>Submission Window</p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Opens</label>
              <input className="form-input" type="datetime-local" value={form.submission_start} onChange={set('submission_start')} />
            </div>
            <div className="form-group">
              <label className="form-label">Closes</label>
              <input className="form-input" type="datetime-local" value={form.submission_end} onChange={set('submission_end')} />
            </div>
          </div>
        </div>

        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'1.25rem' }}>
          <p className="form-label" style={{ marginBottom:'0.75rem' }}>Voting Window</p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Voting Opens</label>
              <input className="form-input" type="datetime-local" value={form.voting_start} onChange={set('voting_start')} />
            </div>
            <div className="form-group">
              <label className="form-label">Voting Closes</label>
              <input className="form-input" type="datetime-local" value={form.voting_end} onChange={set('voting_end')} />
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:'0.75rem', paddingTop:'0.5rem' }}>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create Contest'}
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/contests')} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
