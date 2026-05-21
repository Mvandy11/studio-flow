import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMembership } from '../hooks/useMembership';
import { supabase } from '../lib/supabaseClient';
import { isCreatorAdmin } from '../lib/roles';
import LivePlayer from '../components/LivePlayer';
import MembershipBadge from '../components/MembershipBadge';
import '../styles/portfolio.css';

const SOCIAL_ICONS = {
  instagram: '📷', youtube: '▶️', twitter: '🐦', tiktok: '🎵', website: '🌐',
};

/* ── small helpers ─────────────────────────────────────────── */
function ProfileLink({ to, children }) {
  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.45rem 0.9rem', borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.03)',
        color: 'rgba(220,220,235,0.85)', fontSize: '0.83rem', fontWeight: 500,
        textDecoration: 'none', transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'rgba(110,168,255,0.35)';
        e.currentTarget.style.background   = 'rgba(110,168,255,0.06)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
        e.currentTarget.style.background   = 'rgba(255,255,255,0.03)';
      }}
    >
      {children}
    </Link>
  );
}

function AdminLink({ to, children }) {
  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.45rem 0.9rem', borderRadius: '8px',
        border: '1px solid rgba(245,166,35,0.2)', background: 'rgba(245,166,35,0.05)',
        color: 'var(--accent-gold, #f5a623)', fontSize: '0.83rem', fontWeight: 500,
        textDecoration: 'none', transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'rgba(245,166,35,0.45)';
        e.currentTarget.style.background   = 'rgba(245,166,35,0.12)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'rgba(245,166,35,0.2)';
        e.currentTarget.style.background   = 'rgba(245,166,35,0.05)';
      }}
    >
      {children}
    </Link>
  );
}

function TipJar({ creatorName }) {
  const [sent, setSent] = useState(false);
  const amounts = [3, 5, 10, 20];
  return (
    <div className="tip-jar">
      <div className="tip-jar__title">💛 Tip Jar</div>
      <p className="tip-jar__desc">Support {creatorName}'s work with a one-time tip.</p>
      {sent ? (
        <p style={{ color: '#86efac', fontWeight: 600 }}>Thank you for your support! 🙏</p>
      ) : (
        <div className="tip-jar__amounts">
          {amounts.map((a) => (
            <button key={a} className="tip-jar__btn" onClick={() => setSent(true)}>${a}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Membership card (own profile only) ────────────────────── */
function MembershipSection({ user }) {
  const { tier, meta, isActive, expiresAt, loading } = useMembership(user);

  if (loading) return null;

  const tierDescriptions = {
    free:       'Access to basic platform features. Upgrade to unlock events, enhanced tools, and priority support.',
    monthly:    'Full platform access. Enjoy all features including custom events, AI tools, and contest participation.',
    enterprise: 'Premium access with priority support, dedicated features, and maximum earning potential.',
  };

  return (
    <div className="portfolio-section" id="membership">
      <h2 className="portfolio-section-title">🌟 Membership</h2>

      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${meta.border}`,
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {/* Tier badge + status row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            padding: '0.3rem 0.85rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            background: meta.bg,
            color: meta.color,
            border: `1px solid ${meta.border}`,
          }}>
            {tier === 'enterprise' ? '✦ ' : ''}{meta.label}
          </span>

          <span style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: isActive ? '#86efac' : 'rgba(200,200,215,0.4)',
          }}>
            {isActive ? '● Active' : '○ Inactive'}
          </span>

          {expiresAt && (
            <span style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.4)' }}>
              Renews {expiresAt}
            </span>
          )}
        </div>

        <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(200,200,215,0.55)', lineHeight: 1.5 }}>
          {tierDescriptions[tier] ?? tierDescriptions.free}
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {tier === 'free' && (
            <Link
              to="/subscription"
              style={{
                padding: '0.55rem 1.25rem', borderRadius: '9px',
                background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(96,165,250,0.07))',
                border: '1px solid rgba(96,165,250,0.35)',
                color: '#60a5fa', fontWeight: 700, fontSize: '0.875rem',
                textDecoration: 'none', transition: 'opacity 0.15s',
              }}
            >
              ⬆ Upgrade Membership
            </Link>
          )}
          {tier !== 'free' && (
            <Link
              to="/subscription"
              style={{
                padding: '0.55rem 1.25rem', borderRadius: '9px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(200,200,215,0.8)', fontWeight: 500, fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Manage Subscription
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Payout summary (own profile only) ─────────────────────── */
function PayoutSection({ user }) {
  const [method, setMethod] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('creator_settings')
      .select('payout_method, paypal, venmo, stripe, cashapp')
      .eq('creator_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setMethod(data?.payout_method || null);
        setLoaded(true);
      });
  }, [user]);

  const LABELS = { paypal: 'PayPal', venmo: 'Venmo', stripe: 'Stripe Connect', cashapp: 'CashApp' };

  return (
    <div className="portfolio-section" id="payouts">
      <h2 className="portfolio-section-title">💳 Payout Settings</h2>
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          {loaded && method ? (
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(200,200,215,0.65)' }}>
              Receiving payouts via <strong style={{ color: '#fff' }}>{LABELS[method] ?? method}</strong>
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(200,200,215,0.4)' }}>
              No payout method set. Add one to receive earnings.
            </p>
          )}
        </div>
        <Link
          to="/settings/payouts"
          style={{
            padding: '0.5rem 1.1rem', borderRadius: '9px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(200,200,215,0.8)', fontWeight: 500, fontSize: '0.85rem',
            textDecoration: 'none', flexShrink: 0,
          }}
        >
          {method ? 'Edit Payout Method' : 'Add Payout Method →'}
        </Link>
      </div>
    </div>
  );
}

/* ── Account settings section (own profile only) ───────────── */
function AccountSection({ onLogout, userEmail }) {
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg,      setPwMsg]      = useState('');

  async function sendPasswordReset() {
    if (!userEmail) return;
    setChangingPw(true);
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
    setChangingPw(false);
    setPwMsg(error ? error.message : 'Check your email for a password reset link.');
  }

  return (
    <div className="portfolio-section" id="settings">
      <h2 className="portfolio-section-title">⚙ Account Settings</h2>
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {/* Password reset */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'rgba(220,220,235,0.85)' }}>Change Password</p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(200,200,215,0.4)' }}>
              We'll send a reset link to your email.
            </p>
          </div>
          <button
            onClick={sendPasswordReset}
            disabled={changingPw}
            style={{
              padding: '0.45rem 1rem', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(200,200,215,0.75)', fontSize: '0.83rem',
              cursor: 'pointer', fontWeight: 500,
            }}
          >
            {changingPw ? 'Sending…' : 'Send Reset Email'}
          </button>
        </div>
        {pwMsg && <p style={{ margin: 0, fontSize: '0.8rem', color: '#86efac' }}>{pwMsg}</p>}

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Log out */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'rgba(220,220,235,0.85)' }}>Log Out</p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(200,200,215,0.4)' }}>
              Sign out of your Studio Flow account.
            </p>
          </div>
          <button
            onClick={onLogout}
            style={{
              padding: '0.45rem 1rem', borderRadius: '8px',
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5', fontSize: '0.83rem',
              cursor: 'pointer', fontWeight: 500,
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; }}
            onMouseOut={(e)  => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; }}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function CreatorProfile() {
  const { id } = useParams();
  const { user, role, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [profile,      setProfile]      = useState(null);
  const [sessions,     setSessions]     = useState([]);
  const [events,       setEvents]       = useState([]);
  const [profileLoading, setProfileLoading] = useState(true);

  const profileId = id || user?.id;

  /* ── Load profile once auth is resolved ─────────────────── */
  useEffect(() => {
    // Wait for auth to resolve before deciding anything
    if (authLoading) return;

    // No target — unauthenticated user at /profile with no :id
    if (!profileId) {
      setProfileLoading(false);
      return;
    }

    async function load() {
      setProfileLoading(true);
      const [{ data: p }, { data: s }, { data: e }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', profileId).maybeSingle(),
        supabase.from('sessions').select('*').eq('creator_id', profileId).order('created_at', { ascending: false }).limit(12),
        supabase.from('events').select('*').eq('creator_id', profileId).order('created_at', { ascending: false }).limit(6),
      ]);
      setProfile(p);
      setSessions(s || []);
      setEvents(e || []);
      setProfileLoading(false);
    }

    load();
  }, [authLoading, profileId]);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  /* ── Loading states ─────────────────────────────────────── */
  if (authLoading || profileLoading) {
    return (
      <div className="portfolio-page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="cinematic-spinner" />
      </div>
    );
  }

  /* ── No session + no :id → prompt to log in ────────────── */
  if (!profileId) {
    return (
      <div className="portfolio-page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>◉</p>
        <p style={{ color: 'rgba(200,200,215,0.65)', fontSize: '1rem', marginBottom: '1.25rem' }}>
          Log in to view your profile.
        </p>
        <Link to="/login" className="btn btn--primary" style={{ textDecoration: 'none' }}>
          Log In
        </Link>
      </div>
    );
  }

  /* ── Profile row missing — synthesize from auth user ───── */
  // Logged-in user has no profiles row yet (happens on first login)
  const effectiveProfile = profile ?? (
    user?.id === profileId
      ? { id: user.id, display_name: user.email?.split('@')[0], username: null, bio: null, avatar_url: null, cover_url: null, social_links: {}, is_live: false, live_stream_url: null, live_stream_type: 'youtube' }
      : null
  );

  if (!effectiveProfile) {
    return (
      <div className="portfolio-page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p style={{ color: 'rgba(200,200,215,0.5)' }}>Unable to load profile. Please refresh.</p>
      </div>
    );
  }

  const displayName = effectiveProfile.display_name || effectiveProfile.username || 'Creator';
  const initial     = displayName[0]?.toUpperCase() ?? '?';
  const socialLinks = effectiveProfile.social_links || {};
  const isOwn       = user?.id === effectiveProfile.id;

  return <ProfileView
    profile={effectiveProfile}
    displayName={displayName}
    initial={initial}
    socialLinks={socialLinks}
    isOwn={isOwn}
    sessions={sessions}
    events={events}
    user={user}
    role={role}
    onLogout={handleLogout}
  />;
}

/* ── ProfileView — separated to keep hooks rules clean ──────── */
function ProfileView({
  profile, displayName, initial, socialLinks,
  isOwn, sessions, events, user, role, onLogout,
}) {
  const [goLiveUrl,    setGoLiveUrl]    = useState(profile.live_stream_url  || '');
  const [goLiveType,   setGoLiveType]   = useState(profile.live_stream_type || 'youtube');
  const [isLiveNow,    setIsLiveNow]    = useState(profile.is_live          || false);
  const [goLiveSaving, setGoLiveSaving] = useState(false);
  const [goLiveMsg,    setGoLiveMsg]    = useState('');

  async function saveGoLive() {
    setGoLiveSaving(true);
    setGoLiveMsg('');
    const { error } = await supabase
      .from('profiles')
      .update({ live_stream_url: goLiveUrl || null, live_stream_type: goLiveType, is_live: isLiveNow })
      .eq('id', user.id);
    setGoLiveSaving(false);
    setGoLiveMsg(error ? error.message : isLiveNow ? '🔴 You are now live!' : '✅ Stream settings saved.');
  }

  return (
    <div className="portfolio-page">
      {/* Cover */}
      {profile.cover_url
        ? <img src={profile.cover_url} alt="Cover" className="portfolio-cover" />
        : <div className="portfolio-cover" />}

      {/* Header row */}
      <div className="portfolio-header">
        <div className="portfolio-avatar">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : initial}
        </div>

        <div className="portfolio-identity">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <h1 className="portfolio-name" style={{ margin: 0 }}>{displayName}</h1>
            <MembershipBadge active={profile.subscription_active} />
            {profile.is_live && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.6rem', borderRadius: '999px',
                background: '#ef4444', color: '#fff',
                fontSize: '0.62rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                animation: 'live-pulse 2s ease-in-out infinite',
              }}>
                🔴 LIVE
              </span>
            )}
          </div>
          {profile.bio && <p className="portfolio-bio">{profile.bio}</p>}
          {Object.entries(socialLinks).length > 0 && (
            <div className="portfolio-social">
              {Object.entries(socialLinks).map(([platform, url]) =>
                url ? (
                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="portfolio-social-link">
                    {SOCIAL_ICONS[platform] || '🔗'} {platform}
                  </a>
                ) : null
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="portfolio-actions">
          {!isOwn && (
            <>
              <a href={`mailto:?subject=Hire ${displayName}`} className="portfolio-cta portfolio-cta--primary">Hire Me</a>
              <Link to="/events/create" className="portfolio-cta portfolio-cta--secondary">Book a Session</Link>
            </>
          )}
          {isOwn && (
            <Link to="/premier/settings" className="portfolio-cta portfolio-cta--secondary">Edit Profile</Link>
          )}
        </div>
      </div>

      {/* Live player */}
      {profile.is_live && profile.live_stream_url && (
        <div style={{ padding: '0 1.5rem', marginTop: '0.5rem' }}>
          <LivePlayer url={profile.live_stream_url} label={`${displayName} — Live`} />
        </div>
      )}

      {/* Stats */}
      <div className="portfolio-stats">
        <div className="portfolio-stat">
          <div className="portfolio-stat-value">{sessions.length}</div>
          <div className="portfolio-stat-label">Sessions</div>
        </div>
        <div className="portfolio-stat">
          <div className="portfolio-stat-value">{events.length}</div>
          <div className="portfolio-stat-label">Events</div>
        </div>
        <div className="portfolio-stat">
          <div className="portfolio-stat-value">0</div>
          <div className="portfolio-stat-label">Followers</div>
        </div>
      </div>

      {/* ── Own-profile sections ─────────────────────────────── */}
      {isOwn && (
        <>
          {/* Membership */}
          <MembershipSection user={user} />

          {/* Payout Settings */}
          <PayoutSection user={user} />

          {/* Quick links */}
          <div className="portfolio-section">
            <h2 className="portfolio-section-title">🔗 Quick Links</h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(200,200,215,0.35)', marginBottom: '0.6rem' }}>
                Creator Tools
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <ProfileLink to="/submissions">My Submissions</ProfileLink>
                <ProfileLink to="/contests">My Contest Entries</ProfileLink>
                <ProfileLink to="/events">My Events</ProfileLink>
                <ProfileLink to="/earnings">My Earnings</ProfileLink>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(200,200,215,0.35)', marginBottom: '0.6rem' }}>
                Platform
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <ProfileLink to="/contests">Contests</ProfileLink>
                <ProfileLink to="/events">Events</ProfileLink>
                <ProfileLink to="/creator-academy">Academy</ProfileLink>
                <ProfileLink to="/announcements">Announcements</ProfileLink>
              </div>
            </div>

            {isCreatorAdmin(role) && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(245,166,35,0.5)', marginBottom: '0.6rem' }}>
                  Admin
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <AdminLink to="/admin">Admin Dashboard</AdminLink>
                  <AdminLink to="/admin/event-requests">Event Requests</AdminLink>
                </div>
              </div>
            )}
          </div>

          {/* Go Live panel */}
          <div className="portfolio-section">
            <h2 className="portfolio-section-title">📡 Go Live</h2>
            <div style={{
              background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)',
              borderRadius: '16px', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1rem',
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.45)', marginBottom: '0.4rem' }}>
                  Livestream URL
                </label>
                <input
                  className="cinematic-input"
                  placeholder="YouTube Live, Twitch, Vimeo, or Cloudflare Stream URL"
                  value={goLiveUrl}
                  onChange={(e) => setGoLiveUrl(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.45)', marginBottom: '0.4rem' }}>
                  Platform
                </label>
                <select
                  value={goLiveType}
                  onChange={(e) => setGoLiveType(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', color: 'rgba(220,220,235,0.85)',
                    padding: '0.55rem 0.85rem', fontSize: '0.88rem',
                    cursor: 'pointer', width: '100%', maxWidth: '220px',
                  }}
                >
                  <option value="youtube">YouTube Live</option>
                  <option value="twitch">Twitch</option>
                  <option value="vimeo">Vimeo Live</option>
                  <option value="cloudflare">Cloudflare Stream</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isLiveNow}
                  onClick={() => setIsLiveNow((v) => !v)}
                  style={{
                    position: 'relative', width: '44px', height: '24px',
                    borderRadius: '999px', border: 'none', cursor: 'pointer',
                    background: isLiveNow ? '#ef4444' : 'rgba(255,255,255,0.12)',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '3px',
                    left: isLiveNow ? '23px' : '3px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                  }} />
                </button>
                <span style={{ fontSize: '0.88rem', color: isLiveNow ? '#fca5a5' : 'rgba(200,200,215,0.55)', fontWeight: 600 }}>
                  {isLiveNow ? '🔴 You are live' : 'Go Live'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={saveGoLive}
                  disabled={goLiveSaving}
                  style={{
                    padding: '0.55rem 1.25rem', borderRadius: '8px',
                    background: isLiveNow ? '#ef4444' : 'rgba(255,255,255,0.07)',
                    border: isLiveNow ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {goLiveSaving ? 'Saving…' : isLiveNow ? '📡 Save & Go Live' : 'Save Settings'}
                </button>
                {goLiveMsg && (
                  <span style={{ fontSize: '0.82rem', color: isLiveNow ? '#fca5a5' : '#86efac' }}>
                    {goLiveMsg}
                  </span>
                )}
              </div>

              {goLiveUrl && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.35)', marginBottom: '0.5rem' }}>Preview</p>
                  <LivePlayer url={goLiveUrl} label="Preview" />
                </div>
              )}
            </div>
          </div>

          {/* Account Settings */}
          <AccountSection onLogout={onLogout} userEmail={user?.email} />
        </>
      )}

      {/* Sessions gallery */}
      {sessions.length > 0 && (
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">🎬 Sessions</h2>
          <div className="portfolio-sessions-grid">
            {sessions.map((s) => (
              <Link key={s.id} to={`/session/${s.id}`} className="portfolio-session-card">
                {s.thumbnail_url
                  ? <img src={s.thumbnail_url} alt={s.title} className="portfolio-session-thumb" loading="lazy" />
                  : <div className="portfolio-session-thumb" style={{ background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🎬</div>
                }
                <div className="portfolio-session-body">
                  <p className="portfolio-session-title">{s.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {events.length > 0 && (
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">📅 Events</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {events.map((ev) => (
              <Link
                key={ev.id}
                to={`/events/${ev.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.875rem 1rem', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  textDecoration: 'none', transition: 'border-color 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(110,168,255,0.3)'}
                onMouseOut={(e)  => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
              >
                {ev.thumbnail_url && (
                  <img src={ev.thumbnail_url} alt={ev.title} style={{ width: '64px', height: '48px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-soft)' }}>{ev.title}</p>
                  {ev.is_paid_event && (
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', color: 'var(--accent-gold)' }}>
                      ${ev.ticket_price} ticket
                    </p>
                  )}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'rgba(200,200,215,0.4)' }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tip Jar — only on other creators' profiles */}
      {!isOwn && <TipJar creatorName={displayName} />}
    </div>
  );
}
