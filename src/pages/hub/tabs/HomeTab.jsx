import { CONTESTS, EVENTS, EDUCATION_CATEGORIES } from '../data.js';

export default function HomeTab({ isMember, onToggleMember, onTabChange, stats }) {
  const featured = CONTESTS.slice(0, 4);

  return (
    <div className="hub-content">
      {/* Hero */}
      <div className="hub-hero">
        <div className="hub-hero__eyebrow">Obviously Inspired Studio</div>
        <h1 className="hub-hero__title">Studio Flow — Where Creators Compete, Learn & Earn</h1>
        <p className="hub-hero__subtitle">
          Enter contests, attend ticketed events, stream live education sessions, and win real payouts.
        </p>
        {!isMember ? (
          <button className="hub-hero__cta" onClick={onToggleMember}>
            🌟 Become a Studio Flow Member
          </button>
        ) : (
          <div style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', padding:'0.65rem 1.25rem', borderRadius:'10px', background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.3)', color:'#22c55e', fontWeight:700, fontSize:'0.9rem' }}>
            ✓ Studio Flow Member
          </div>
        )}
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
          <div className="hub-stat__value">{stats.educationSessions}</div>
          <div className="hub-stat__label">Education Sessions</div>
        </div>
        <div className="hub-stat">
          <div className="hub-stat__value">{stats.totalMembers}</div>
          <div className="hub-stat__label">Total Members</div>
        </div>
      </div>

      {/* Featured Contests */}
      <div style={{ marginBottom:'2rem' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
          <h2 className="hub-section-title" style={{ margin:0 }}>🏆 Featured Contests</h2>
          <button className="hub-btn hub-btn--ghost" onClick={() => onTabChange('Contests')}>
            View All →
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'1rem' }}>
          {featured.map((c) => (
            <div key={c.id} className="contest-card-hub" style={{ cursor:'pointer' }} onClick={() => onTabChange('Contests')}>
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
                <span style={{ marginLeft:'auto', fontSize:'0.82rem', color:'var(--hub-gold)', fontWeight:600 }}>
                  Enter →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem' }}>
        {[
          { icon:'🎟', label:'Browse Events', tab:'Events', color:'var(--hub-blue)' },
          { icon:'📚', label:'Education Sessions', tab:'Education', color:'var(--hub-green)' },
          { icon:'🎫', label:'My Tickets', tab:'My Tickets', color:'var(--hub-gold)' },
        ].map((item) => (
          <button
            key={item.tab}
            className="hub-card"
            style={{ padding:'1.5rem', textAlign:'center', cursor:'pointer', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.5rem', background:'var(--hub-card)', width:'100%' }}
            onClick={() => onTabChange(item.tab)}
          >
            <span style={{ fontSize:'2rem' }}>{item.icon}</span>
            <span style={{ fontSize:'0.9rem', fontWeight:600, color: item.color }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
