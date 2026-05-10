import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isCreatorAdmin } from '../../lib/roles';
import ContestCard from '../../components/contests/ContestCard';
import DonationButton from '../../components/DonationButton';
import '../../styles/contests.css';
import '../../styles/library-ai-grid.css';
import { api } from '../../lib/api.js';

const STATUS_FILTERS = [
  { value: '',          label: 'All' },
  { value: 'active',    label: 'Open' },
  { value: 'voting',    label: 'Voting' },
  { value: 'completed', label: 'Ended' },
];

const CATEGORY_FILTERS = [
  { value: '',          label: 'All Categories' },
  { value: 'creative',  label: 'Creative' },
  { value: 'music',     label: 'Music' },
  { value: 'film',      label: 'Film' },
  { value: 'comedy',    label: 'Comedy' },
  { value: 'photo',     label: 'Photo' },
  { value: 'design',    label: 'Design' },
  { value: 'general',   label: 'General' },
];

export default function ContestsPage() {
  const { role } = useAuth();
  const [contests,  setContests]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [filter,    setFilter]    = useState('');
  const [category,  setCategory]  = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (filter)   params.set('status', filter);
        if (category) params.set('category', category);
        const { data } = await api(`/api/contests?${params}`);
        setContests(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filter, category]);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap' }}>
        <div>
          <h1 className="page-title">🏆 Contests</h1>
          <p className="page-subtitle">Submit your work, like your favorites, and win prizes. Winners are selected by the admin based on likes and quality.</p>
        </div>
        {isCreatorAdmin(role) && (
          <Link to="/contests/create" className="btn btn--primary" style={{ textDecoration:'none' }}>
            + Create Contest
          </Link>
        )}
      </div>

      <div className="ai-grid__filters" style={{ marginBottom:'0.75rem' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            className={`ai-grid__filter${filter === f.value ? ' ai-grid__filter--active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="ai-grid__filters" style={{ marginBottom:'1.5rem' }}>
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.value}
            className={`ai-grid__filter${category === f.value ? ' ai-grid__filter--active' : ''}`}
            onClick={() => setCategory(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="ai-grid__error">{error}</p>}

      {loading && (
        <div className="contests-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ai-card ai-card--skeleton" style={{ height:'240px', borderRadius:'16px' }} />
          ))}
        </div>
      )}

      {!loading && !error && contests.length === 0 && (
        <div className="ai-grid__empty">
          <p style={{ fontSize:'2.5rem' }}>🏆</p>
          <p>No contests yet.</p>
          {isCreatorAdmin(role) && (
            <p className="ai-grid__empty-hint">
              <Link to="/contests/create" style={{ color:'var(--accent-blue)' }}>Create the first contest</Link>
            </p>
          )}
        </div>
      )}

      {!loading && contests.length > 0 && (
        <div className="contests-grid">
          {contests.map((c) => <ContestCard key={c.id} contest={c} />)}
        </div>
      )}

      {/* Donation section */}
      {!loading && (
        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <p style={{ textAlign: 'center', color: 'rgba(200,200,215,0.5)', fontSize: '0.9rem', maxWidth: '400px' }}>
            Love what creators are making? Donate to the Reward Pool — 100% goes to contest winners.
          </p>
          <DonationButton />
        </div>
      )}
    </div>
  );
}
