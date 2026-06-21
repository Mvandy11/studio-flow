import { useNavigate } from 'react-router-dom';
import { categories } from '../../../data/categories.js';
import DonationButton from '../../../components/DonationButton.jsx';
import FoundingMembersSection from '../../../components/home/FoundingMembersSection.jsx';
import FoundingMemberSection from '../../../components/FoundingMemberSection.jsx';
import FoundingMembersDisplay from '../../../components/FoundingMembersDisplay.jsx';

export default function HomeTab({ stats }) {
  const navigate = useNavigate();

  return (
    <div className="hub-content">
      {/* Hero */}
      <div className="hub-hero">
        <div className="hub-hero__eyebrow">Obviously Inspired Studio</div>
        <h1 className="hub-hero__title">Studio Flow — Where Creators Compete &amp; Earn</h1>
        <p className="hub-hero__subtitle">
          Submit your work, enter contests, and watch live creator events.
          Entry is free — winners hand-selected by our admin team based on creativity and quality.
        </p>
      </div>

      {/* Stats */}
      <div className="hub-stats">
        <div className="hub-stat">
          <div className="hub-stat__value">{stats.activeContests}</div>
          <div className="hub-stat__label">Contests</div>
        </div>
        <div className="hub-stat">
          <div className="hub-stat__value">{stats.upcomingEvents}</div>
          <div className="hub-stat__label">Upcoming Events</div>
        </div>
        <div className="hub-stat">
          <div className="hub-stat__value">{stats.totalMembers}</div>
          <div className="hub-stat__label">Total Members</div>
        </div>
      </div>

      <FoundingMemberSection />
      <FoundingMembersDisplay />

      {/* Donation strip */}
      <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.15)', borderRadius: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Support the Reward Pool 💝</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'rgba(200,200,215,0.5)' }}>
            100% of donations go directly to contest winners
          </p>
        </div>
        <DonationButton compact />
      </div>

      {/* Category cards — single source of truth: src/data/categories.js */}
      <h2 className="hub-section-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>📁 Browse Categories</h2>
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
