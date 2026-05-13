import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isCreatorAdmin } from '../../lib/roles';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api.js';
import '../../styles/contests.css';

const CATEGORIES = [
  { value: 'general',  label: 'General' },
  { value: 'creative', label: 'Creative' },
  { value: 'music',    label: 'Music' },
  { value: 'film',     label: 'Film' },
  { value: 'comedy',   label: 'Comedy' },
  { value: 'photo',    label: 'Photo' },
  { value: 'design',   label: 'Design' },
];

export default function CreateContestPage() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title:         '',
    description:   '',
    thumbnail_url: '',
    prize_pool:    '',
    winner_count:  '1',
    status:        'active',
    category:      'general',
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

      const json = await api('/api/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title:         form.title.trim(),
          description:   form.description.trim() || null,
          thumbnail_url: form.thumbnail_url.trim() || null,
          prize_pool:    Number(form.prize_pool)   || 0,
          winner_count:  Number(form.winner_count) || 1,
          status:        form.status,
          category:      form.category,
        }),
      });
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
        <p className="page-subtitle">Set up a new open contest for the Studio Flow community.</p>
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
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Visibility</label>
            <select className="form-select" value={form.status} onChange={set('status')}>
              <option value="active">Active (Visible)</option>
              <option value="draft">Draft (Hidden)</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Prize Pool ($)</label>
            <input className="form-input" type="number" min="0" value={form.prize_pool} onChange={set('prize_pool')} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Number of Winners</label>
            <select className="form-select" value={form.winner_count} onChange={set('winner_count')}>
              <option value="1">1 Winner</option>
              <option value="2">2 Winners</option>
              <option value="3">3 Winners</option>
            </select>
          </div>
        </div>

        <div style={{ padding:'0.75rem 1rem', borderRadius:'10px', background:'rgba(110,168,255,0.06)', border:'1px solid rgba(110,168,255,0.15)', color:'rgba(200,200,215,0.6)', fontSize:'0.82rem', marginBottom:'0.5rem' }}>
          Contests on Studio Flow are always open — there are no submission deadlines or voting windows. Winners are selected manually by you from the contest detail page.
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
