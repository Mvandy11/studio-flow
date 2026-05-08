import { useNavigate } from 'react-router-dom';
import { CONTESTS } from '../data.js';
import { categories } from '../../../data/categories.js';
import DonationButton from '../../../components/DonationButton.jsx';

export default function HomeTab({ onTabChange, stats }) {
  const navigate  = useNavigate();
  const featured  = CONTESTS.slice(0, 4);

  return (
    <div className="hub-content">
      {/* Hero */}
      <div className="hub-hero">
        <div className="hub-hero__eyebrow">Obviously Inspired Studio</div>
        <h1 className="hub-hero__title">Studio Flow — Where Creators Compete &amp; Earn</h1>
        <p className="hub-hero__subtitle">
          Enter contests, attend events, submit your work, and request custom event builds. Entry is free — winners selected by admin based on likes and quality.
        </p>
      </div>

      {/* Stats */}
      <div className="hub-stats">
        <div className="hub-stat">
          <div className="hub-stat__value">{stats.activeContests}</div>
          <div className="hub-stat__label">Active Contests</div>
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

      {/* Featured Contests */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 className="hub-section-title" style={{ margin: 0 }}>🏆 Featured Contests</h2>
          <button className="hub-btn hub-btn--ghost" onClick={() => onTabChange('Contests')}>
            View All →
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {featured.map((c) => (
            <div key={c.id} className="contest-card-hub" style={{ cursor: 'pointer' }} onClick={() => onTabChange('Contests')}>
              <div className="contest-card-hub__header">
                <span className="contest-card-hub__emoji">{c.emoji}</span>
                <div className="contest-card-hub__meta">
                  <p className="contest-card-hub__title">{c.title}</p>
                  <p className="contest-card-hub__desc">{c.description}</p>
                </div>
              </div>
              <div className="contest-card-hub__actions">
                <span className={`hub-badge hub-badge--${c.status === 'active' ? 'open' : c.status}`}>
                  {c.status === 'active' ? 'Open' : c.status}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--hub-gold)', fontWeight: 600 }}>
                  Enter Free →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Donation strip */}
      <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.15)', borderRadius: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Support the Reward Pool 💝</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'rgba(200,200,215,0.5)' }}>100% of donations go directly to contest winners</p>
        </div>
        <DonationButton compact />
      </div>

      {/* Category cards — synced with dropdown/sidebar navigation */}
      <h2 className="hub-section-title" style={{ marginBottom: '1rem' }}>📂 Browse Categories</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className="hub-card"
            style={{ padding: '1.5rem', textAlign: 'left', cursor: 'pointer', border: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--hub-card)', width: '100%', borderRadius: '14px' }}
            onClick={() => navigate(cat.route)}
          >
            <span style={{ fontSize: '2rem' }}>{cat.icon}</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: cat.color }}>{cat.title}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--hub-muted)', lineHeight: 1.4 }}>{cat.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
