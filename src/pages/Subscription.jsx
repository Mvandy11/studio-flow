import { useAuth } from '../hooks/useAuth';
import { useMembership } from '../hooks/useMembership';

const MEMBER_30_LINK   = 'https://buy.stripe.com/7sYdRb2yx3JS1wwacZb7y0o';
const SUPPORT_EMAIL    = 'ObviouslyInspiredStudio@outlook.com';

const MEMBER_30_FEATURES = [
  '🏆 Enter monthly contests — always free',
  '💬 Free Chat access',
  '📢 Early access to announcements',
  '❤️ Like and support creator submissions',
  '💰 $10 → Monthly Reward Pool',
];

const CREATOR_50_FEATURES = [
  '📅 Create & publish events',
  '📡 RTMP / HLS streaming',
  '💸 Accept donations',
  '🤖 AI Tools — Enhance · Upscale · Denoise',
  '🎓 Creator Academy',
  '🏆 Enter monthly contests — always free',
  '💬 Free Chat access',
  '📢 Early access to announcements',
  '❤️ Like and support creator submissions',
  '⭐ Priority review',
  '💰 $10 → Monthly Reward Pool',
  '🎬 $15 → Event Creator Pool',
  '📊 Creator Dashboard + Analytics',
  '🎟 Ticket sales via Stripe Payment Links',
  '💳 Premier Payout Settings (Stripe Connect)',
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { isActive, tier, loading: membershipLoading } = useMembership();

  const tierLabel =
    tier === 'member_30'   ? '$30 Member' :
    tier === 'creator_50'  ? '$50 Creator Member' :
    tier ?? 'Free';

  return (
    <div style={page}>
      <div style={wrapper}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎬</div>
          <h1 style={title}>Studio Flow Membership</h1>
          <p style={subtitle}>
            Join the cinematic creator community. Choose the plan that fits your craft.
          </p>

          {user && !membershipLoading && (
            <div style={{
              display:       'inline-flex',
              alignItems:    'center',
              gap:           '0.5rem',
              padding:       '0.45rem 1.1rem',
              borderRadius:  '50px',
              fontSize:      '0.82rem',
              fontWeight:    700,
              letterSpacing: '0.03em',
              background:    isActive ? 'rgba(134,239,172,0.12)' : 'rgba(156,163,175,0.1)',
              border:        isActive ? '1px solid rgba(134,239,172,0.35)' : '1px solid rgba(156,163,175,0.2)',
              color:         isActive ? '#86efac' : 'rgba(200,200,215,0.5)',
            }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: isActive ? '#86efac' : 'rgba(200,200,215,0.35)',
                flexShrink: 0,
                boxShadow: isActive ? '0 0 6px #86efac' : 'none',
              }} />
              {isActive ? `Active · ${tierLabel}` : 'No active membership'}
            </div>
          )}
        </div>

        {/* Plan cards */}
        <div style={plansRow}>

          {/* ── $30 Member ── */}
          <div style={{ ...planCard, ...(tier === 'member_30' && activePlanBorder) }}>
            {tier === 'member_30' && (
              <div style={activeBadge}>Your Plan</div>
            )}
            <div style={planHeader}>
              <span style={planName}>Member</span>
              <span style={planPrice}>$30<span style={planPer}>/mo</span></span>
            </div>
            <p style={planTagline}>Support the community and unlock your place in Studio Flow.</p>

            <ul style={featureList}>
              {MEMBER_30_FEATURES.map((f, i) => (
                <li key={i} style={featureItem}>{f}</li>
              ))}
            </ul>

            <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
              {isActive ? (
                <div style={alreadyActive}>✅ Active</div>
              ) : (
                <a
                  href={MEMBER_30_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={btnPrimary}
                >
                  Join for $30/month
                </a>
              )}
            </div>
          </div>

          {/* ── $50 Creator Member ── */}
          <div style={{ ...planCard, ...creatorCard, ...(tier === 'creator_50' && activePlanBorder) }}>
            {tier === 'creator_50' && (
              <div style={activeBadge}>Your Plan</div>
            )}
            <div style={{ position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)' }}>
              <span style={popularBadge}>Most Powerful</span>
            </div>
            <div style={planHeader}>
              <span style={planName}>Creator Member</span>
              <span style={planPrice}>$50<span style={planPer}>/mo</span></span>
            </div>
            <p style={planTagline}>Everything in Member — plus full creator tools and monetization.</p>

            <ul style={featureList}>
              {CREATOR_50_FEATURES.map((f, i) => (
                <li key={i} style={featureItem}>{f}</li>
              ))}
            </ul>

            <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
              {isActive && tier === 'creator_50' ? (
                <div style={alreadyActive}>✅ Active</div>
              ) : (
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=Creator%20Member%20%2450%2Fmo%20Sign%20Up&body=Hi%2C%20I%27d%20like%20to%20join%20the%20%2450%20Creator%20Member%20plan.%20Please%20send%20my%20Stripe%20link.`}
                  style={btnCreator}
                >
                  Get Creator Link
                </a>
              )}
            </div>
          </div>

        </div>

        {/* Reward pool note */}
        <div style={poolNote}>
          <strong style={{ color: 'var(--accent-gold, #f5a623)' }}>💰 $10 of every membership</strong>
          {' '}goes directly into the monthly Reward Pool, distributed to contest winners.
          Creator Members also contribute <strong style={{ color: '#c084fc' }}>$15 to the Event Creator Pool</strong>.
        </div>

        {/* Membership Management */}
        <div style={mgmtBox}>
          <strong style={{ color: 'var(--accent-gold, #f5a623)' }}>Membership Management</strong>
          <p style={{ marginTop: '0.35rem' }}>
            Studio Flow uses secure Stripe Payment Links for memberships.
            To cancel your plan, upgrade to a new tier, or request end‑of‑service,
            contact support at:
          </p>
          <p style={{ marginTop: '0.35rem', fontWeight: 600, color: '#fff', wordBreak: 'break-all' }}>
            {SUPPORT_EMAIL}
          </p>
          <p style={{ marginTop: '0.35rem', opacity: 0.8 }}>
            A team member will send your personalized Stripe link to complete the request.
          </p>
        </div>

      </div>
    </div>
  );
}

/* ── Styles ── */
const page = {
  minHeight: '100vh',
  padding:   '3rem 1rem 4rem',
};

const wrapper = {
  maxWidth: '900px',
  margin:   '0 auto',
};

const title = {
  fontSize:     '2rem',
  fontWeight:   800,
  color:        '#fff',
  margin:       '0 0 0.5rem',
};

const subtitle = {
  color:    'rgba(200,200,215,0.6)',
  fontSize: '1rem',
  margin:   '0 0 1rem',
};

const plansRow = {
  display:   'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap:       '1.5rem',
  marginBottom: '1.5rem',
};

const planCard = {
  position:     'relative',
  background:   'rgba(255,255,255,0.04)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: '20px',
  padding:      '2rem 1.75rem 1.75rem',
  display:      'flex',
  flexDirection:'column',
};

const creatorCard = {
  background: 'rgba(192,132,252,0.06)',
  border:     '1px solid rgba(192,132,252,0.25)',
};

const activePlanBorder = {
  border: '1px solid rgba(134,239,172,0.4)',
};

const planHeader = {
  display:        'flex',
  justifyContent: 'space-between',
  alignItems:     'center',
  marginBottom:   '0.6rem',
};

const planName = {
  fontWeight: 700,
  fontSize:   '1.1rem',
  color:      '#fff',
};

const planPrice = {
  fontWeight: 800,
  fontSize:   '1.5rem',
  color:      'var(--accent-gold, #f5a623)',
};

const planPer = {
  fontSize:   '0.85rem',
  fontWeight: 400,
  color:      'rgba(200,200,215,0.5)',
};

const planTagline = {
  fontSize:     '0.85rem',
  color:        'rgba(200,200,215,0.55)',
  margin:       '0 0 1.25rem',
  lineHeight:   '1.4',
};

const featureList = {
  listStyle:     'none',
  padding:       0,
  margin:        0,
  display:       'flex',
  flexDirection: 'column',
  gap:           '0.55rem',
};

const featureItem = {
  display:    'flex',
  alignItems: 'flex-start',
  gap:        '0.4rem',
  fontSize:   '0.87rem',
  color:      'rgba(255,255,255,0.75)',
  lineHeight: '1.35',
};

const btnPrimary = {
  display:      'block',
  textAlign:    'center',
  padding:      '0.85rem',
  borderRadius: '12px',
  background:   'var(--accent-gold, #f5a623)',
  color:        '#000',
  fontWeight:   800,
  fontSize:     '0.95rem',
  textDecoration: 'none',
  cursor:       'pointer',
};

const btnCreator = {
  display:      'block',
  textAlign:    'center',
  padding:      '0.85rem',
  borderRadius: '12px',
  background:   'linear-gradient(135deg, #a855f7, #7c3aed)',
  color:        '#fff',
  fontWeight:   800,
  fontSize:     '0.95rem',
  textDecoration: 'none',
  cursor:       'pointer',
};

const alreadyActive = {
  textAlign:  'center',
  color:      '#86efac',
  fontWeight: 700,
  padding:    '0.75rem',
  background: 'rgba(134,239,172,0.08)',
  border:     '1px solid rgba(134,239,172,0.2)',
  borderRadius: '10px',
};

const activeBadge = {
  position:     'absolute',
  top:          '1rem',
  right:        '1rem',
  fontSize:     '0.65rem',
  fontWeight:   700,
  letterSpacing:'0.07em',
  textTransform:'uppercase',
  color:        '#86efac',
  background:   'rgba(134,239,172,0.12)',
  border:       '1px solid rgba(134,239,172,0.25)',
  borderRadius: '4px',
  padding:      '0.2rem 0.55rem',
};

const popularBadge = {
  fontSize:     '0.65rem',
  fontWeight:   700,
  letterSpacing:'0.07em',
  textTransform:'uppercase',
  color:        '#c084fc',
  background:   'rgba(192,132,252,0.12)',
  border:       '1px solid rgba(192,132,252,0.3)',
  borderRadius: '0 0 8px 8px',
  padding:      '0.2rem 0.75rem',
  whiteSpace:   'nowrap',
};

const poolNote = {
  background:   'rgba(245,166,35,0.07)',
  border:       '1px solid rgba(245,166,35,0.18)',
  borderRadius: '12px',
  padding:      '0.85rem 1.1rem',
  fontSize:     '0.87rem',
  color:        'rgba(255,255,255,0.7)',
  lineHeight:   '1.5',
  marginBottom: '1.25rem',
};

const mgmtBox = {
  marginTop:    '0.75rem',
  padding:      '0.75rem 1rem',
  background:   'rgba(255,255,255,0.06)',
  borderRadius: '8px',
  fontSize:     '0.85rem',
  lineHeight:   '1.4',
  color:        'rgba(255,255,255,0.85)',
  border:       '1px solid rgba(255,255,255,0.08)',
};
