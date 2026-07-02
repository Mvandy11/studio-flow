export default function HomeTab({ stats }) {

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

    </div>
  );
}
