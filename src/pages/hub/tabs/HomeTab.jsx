import { useNavigate } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';
import { categories } from '../../../data/categories.js';
import FoundingMembersSection from '../../../components/home/FoundingMembersSection.jsx';

export default function HomeTab({ stats }) {
  const navigate = useNavigate();

  return (
    <div className="hub-content">
      {/* Hero */}
      <div className="hub-hero">
        <h1 className="hub-hero__title">Studio Flow — Where Creators Compete &amp; Earn</h1>
        <p className="hub-hero__subtitle">
          Submit your work, enter contests, and earn from a community that shows up.
          Entry is free — winners hand-selected by our admin team based on creativity and quality.
        </p>
      </div>

      {/* Stats */}
      <div className="hub-stats">
        <div className="hub-stat">
          <div className="hub-stat__value">{stats.activeContests}</div>
          <div className="hub-stat__label">Contests</div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(200,200,215,0.45)', marginTop: '0.2rem', lineHeight: 1.3 }}>Prize pool grows $10 with every member</div>
        </div>
        <div className="hub-stat">
          <div className="hub-stat__value">{stats.totalMembers}</div>
          <div className="hub-stat__label">Total Members</div>
        </div>
      </div>

      {/* Category cards — single source of truth: src/data/categories.js */}
      <h2 className="hub-section-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clapperboard size={20} /> Browse Categories</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className="hub-card"
            style={{
              padding: '1.75rem 1.5rem',
              textAlign: 'left',
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              background: 'var(--hub-card)',
              width: '100%',
              borderRadius: '14px',
            }}
            onClick={() => navigate(cat.route)}
          >
            <span style={{ fontSize: '2.2rem' }}>{cat.icon}</span>
            <span style={{ fontSize: '0.98rem', fontWeight: 700, color: cat.color }}>{cat.title}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--hub-muted)', lineHeight: 1.45 }}>{cat.description}</span>
          </button>
        ))}
      </div>

      <FoundingMembersSection />
    </div>
  );
}
