import { useNavigate } from 'react-router-dom';

const USE_CASES = [
  {
    icon: '🏆',
    role: 'Athletes',
    examples: 'Pre-game hype, post-game breakdowns, draft night moments',
  },
  {
    icon: '🎵',
    role: 'Musicians',
    examples: 'Studio previews, tour stories, album reveals',
  },
  {
    icon: '🎬',
    role: 'Actors',
    examples: 'On-set Q&A, premiere night backstage moments',
  },
  {
    icon: '📲',
    role: 'Influencers',
    examples: 'Exclusive drops, behind-the-scenes access',
  },
  {
    icon: '⭐',
    role: 'Rising Stars',
    examples: 'Early fanbase growth, intimate fan connection',
  },
];

const STAGE_FEATURES = [
  { icon: '💬', label: 'Real-time cinematic chat' },
  { icon: '🔥', label: 'Live emoji reactions' },
  { icon: '📌', label: 'Creator-pinned messages' },
  { icon: '🎟️', label: 'Ticket-gated limited seats' },
  { icon: '👁', label: 'Live viewer presence' },
];

export default function BackstagePassSection() {
  const navigate = useNavigate();

  return (
    <section className="bps-section" aria-labelledby="bps-title">
      <div className="bps-glow-orb bps-glow-orb--left" aria-hidden="true" />
      <div className="bps-glow-orb bps-glow-orb--right" aria-hidden="true" />

      <div className="bps-inner">

        {/* ── Header ── */}
        <header className="bps-header">
          <span className="bps-eyebrow">Studio Flow Exclusive</span>
          <h2 id="bps-title" className="bps-title">
            Backstage Pass Moments
          </h2>
          <p className="bps-subheadline">
            Exclusive, intimate, ticket‑gated live sessions for stars, athletes, and rising talent.
          </p>
        </header>

        {/* ── Body copy ── */}
        <div className="bps-body-copy">
          <p>
            Some moments are too special for the public feed. Studio Flow gives creators a
            private, controlled stage where every viewer earned their seat.
            Limited capacity means real intimacy — not a crowd, a community.
          </p>
          <p>
            Whether you're giving back through a charity drop, rewarding your most loyal
            fans, celebrating an album release, or building your brand from the ground up,
            Backstage Pass Moments are your most powerful tool.
          </p>
        </div>

        {/* ── Use cases ── */}
        <div className="bps-use-cases" role="list">
          {USE_CASES.map(({ icon, role, examples }) => (
            <article key={role} className="bps-use-case-card" role="listitem">
              <span className="bps-use-case-icon" aria-hidden="true">{icon}</span>
              <div>
                <h3 className="bps-use-case-role">{role}</h3>
                <p className="bps-use-case-examples">{examples}</p>
              </div>
            </article>
          ))}
        </div>

        {/* ── Monetize or Give Back ── */}
        <div className="bps-subsection">
          <h3 className="bps-subsection-title">💰 Monetize or Give Back</h3>
          <p className="bps-subsection-body">
            Set your own ticket price and keep what you earn — or make it free for fan-club
            members and charity audiences. Studio Flow never takes a cut of your heart.
            Every dollar flows directly to your payout.
          </p>
        </div>

        {/* ── Live Studio Stage ── */}
        <div className="bps-subsection">
          <h3 className="bps-subsection-title">🎭 Live Studio Stage</h3>
          <p className="bps-subsection-body" style={{ marginBottom: '1.25rem' }}>
            The stage is where the magic happens — a cinematic, real-time room built for
            high-energy moments, deep fan interaction, and lasting memories.
          </p>
          <ul className="bps-stage-features" aria-label="Stage features">
            {STAGE_FEATURES.map(({ icon, label }) => (
              <li key={label} className="bps-stage-feature-item">
                <span aria-hidden="true">{icon}</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── CTA ── */}
        <div className="bps-cta">
          <button
            className="cinematic-button-accent bps-cta-btn"
            onClick={() => navigate('/events/create')}
          >
            Host a Backstage Pass Moment
          </button>
          <p className="bps-cta-note">
            Free to set up. No upfront cost. Keep 100% of your ticket revenue.
          </p>
        </div>

      </div>
    </section>
  );
}
