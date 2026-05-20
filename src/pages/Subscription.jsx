export default function SubscriptionPage() {
  return (
    <div style={page}>
      <div style={card}>
        {/* Header */}
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌟</div>
        <h1 style={title}>Become a Studio Flow Member</h1>
        <p style={subtitle}>
          Support the creator community and unlock your place in the Studio Flow ecosystem.
        </p>

        {/* Plan card */}
        <div style={planBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Studio Flow Membership</span>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent-gold, #f5a623)' }}>$30/month</span>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              '🏆 Enter monthly contests — free, always',
              '❤️ Like and support creator submissions',
              '📢 Early access to announcements',
              '🎁 $10 from your subscription funds the monthly Reward Pool',
              '🎬 Access creator events and education sessions',
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)' }}>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Reward pool callout */}
        <div style={poolNote}>
          <strong style={{ color: 'var(--accent-gold, #f5a623)' }}>💰 $10 of every membership</strong> goes directly into the monthly Reward Pool, distributed to contest winners.
        </div>

        <p style={{ fontSize: '0.85rem', color: 'rgba(200,200,215,0.55)', textAlign: 'center', margin: 0 }}>
          Use the <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Subscribe</strong> button in the top-right menu to get started.
        </p>
      </div>
    </div>
  );
}

/* ── Styles ── */
const page = {
  minHeight: '70vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem',
};

const card = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '22px',
  padding: '2.5rem 2rem',
  maxWidth: '520px',
  width: '100%',
  textAlign: 'center',
};

const title = {
  fontSize: '1.6rem',
  fontWeight: 800,
  color: '#fff',
  margin: '0 0 0.5rem',
};

const subtitle = {
  color: 'rgba(200,200,215,0.6)',
  fontSize: '0.95rem',
  margin: '0 0 1.75rem',
};

const planBox = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '14px',
  padding: '1.25rem',
  marginBottom: '1.25rem',
  textAlign: 'left',
};

const poolNote = {
  background: 'rgba(245,166,35,0.08)',
  border: '1px solid rgba(245,166,35,0.2)',
  borderRadius: '10px',
  padding: '0.75rem 1rem',
  fontSize: '0.85rem',
  color: 'rgba(255,255,255,0.7)',
  marginBottom: '1.5rem',
  textAlign: 'left',
};
