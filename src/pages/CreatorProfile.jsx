import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { isCreatorAdmin } from '../lib/roles';
import LivePlayer from '../components/LivePlayer';
import '../styles/portfolio.css';

const SOCIAL_ICONS = {
  instagram: '📷', youtube: '▶️', twitter: '🐦', tiktok: '🎵', website: '🌐',
};

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
            <button key={a} className="tip-jar__btn" onClick={() => setSent(true)}>
              ${a}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const LINK_GROUP_STYLE = {
  marginBottom: '1.5rem',
};

const LINK_GROUP_LABEL = {
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'rgba(200,200,215,0.35)',
  marginBottom: '0.6rem',
};

const LINK_GRID = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
};

function ProfileLink({ to, children }) {
  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.45rem 0.9rem',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.09)',
        background: 'rgba(255,255,255,0.03)',
        color: 'rgba(220,220,235,0.85)',
        fontSize: '0.83rem',
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'border-color 0.15s, background 0.15s',
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
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.45rem 0.9rem',
        borderRadius: '8px',
        border: '1px solid rgba(245,166,35,0.2)',
        background: 'rgba(245,166,35,0.05)',
        color: 'var(--accent-gold, #f5a623)',
        fontSize: '0.83rem',
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'border-color 0.15s, background 0.15s',
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

export default function CreatorProfile() {
  const { id } = useParams();
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const [profile,  setProfile]  = useState(null);
  const [sessions, setSessions] = useState([]);
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  const profileId = id || user?.id;

  useEffect(() => {
    if (!profileId) return;
    async function load() {
      setLoading(true);
      const [{ data: p }, { data: s }, { data: e }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', profileId).maybeSingle(),
        supabase.from('sessions').select('*').eq('creator_id', profileId).order('created_at', { ascending: false }).limit(12),
        supabase.from('events').select('*').eq('creator_id', profileId).order('created_at', { ascending: false }).limit(6),
      ]);
      setProfile(p);
      setSessions(s || []);
      setEvents(e || []);
      setLoading(false);
    }
    load();
  }, [profileId]);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  if (loading) return (
    <div className="portfolio-page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <div className="cinematic-spinner" />
    </div>
  );

  if (!profile) return (
    <div className="portfolio-page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <p style={{ color: 'rgba(200,200,215,0.5)' }}>Creator not found.</p>
    </div>
  );

  const displayName = profile.display_name || profile.username || 'Creator';
  const initial     = displayName[0]?.toUpperCase() ?? '?';
  const socialLinks = profile.social_links || {};
  const isOwn       = user?.id === profile.id;

  /* ── Go Live state (own profile only) ───────────────────── */
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
      {profile.cover_url ? (
        <img src={profile.cover_url} alt="Cover" className="portfolio-cover" />
      ) : (
        <div className="portfolio-cover" />
      )}

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
              {Object.entries(socialLinks).map(([platform, url]) => (
                url ? (
                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                    className="portfolio-social-link">
                    {SOCIAL_ICONS[platform] || '🔗'} {platform}
                  </a>
                ) : null
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="portfolio-actions">
          {!isOwn && (
            <>
              <a href={`mailto:?subject=Hire ${displayName}`} className="portfolio-cta portfolio-cta--primary">
                Hire Me
              </a>
              <Link to="/events/create" className="portfolio-cta portfolio-cta--secondary">
                Book a Session
              </Link>
            </>
          )}
          {isOwn && (
            <Link to="/premier/settings" className="portfolio-cta portfolio-cta--secondary">
              Edit Profile
            </Link>
          )}
        </div>
      </div>

      {/* Live player — visible to all when creator is live */}
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

      {/* ── Own-profile quick links ─────────────────────────────── */}
      {isOwn && (
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">🔗 Quick Links</h2>

          {/* Creator Tools */}
          <div style={LINK_GROUP_STYLE}>
            <div style={LINK_GROUP_LABEL}>Creator Tools</div>
            <div style={LINK_GRID}>
              <ProfileLink to="/submissions">My Submissions</ProfileLink>
              <ProfileLink to="/contests">My Contest Entries</ProfileLink>
              <ProfileLink to="/events">My Events</ProfileLink>
              <ProfileLink to="/hub">My Tickets</ProfileLink>
              <ProfileLink to="/earnings">My Earnings</ProfileLink>
            </div>
          </div>

          {/* Platform Navigation */}
          <div style={LINK_GROUP_STYLE}>
            <div style={LINK_GROUP_LABEL}>Platform</div>
            <div style={LINK_GRID}>
              <ProfileLink to="/contests">Contests</ProfileLink>
              <ProfileLink to="/events">Custom Events</ProfileLink>
              <ProfileLink to="/creator-academy">Academy</ProfileLink>
              <ProfileLink to="/announcements">Announcements</ProfileLink>
            </div>
          </div>

          {/* Account */}
          <div style={LINK_GROUP_STYLE}>
            <div style={LINK_GROUP_LABEL}>Account</div>
            <div style={LINK_GRID}>
              <ProfileLink to="/premier/settings">Edit Profile</ProfileLink>
              <button
                onClick={handleLogout}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(239,68,68,0.2)',
                  background: 'rgba(239,68,68,0.05)',
                  color: '#fca5a5',
                  fontSize: '0.83rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.45)';
                  e.currentTarget.style.background   = 'rgba(239,68,68,0.12)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
                  e.currentTarget.style.background   = 'rgba(239,68,68,0.05)';
                }}
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Admin — creator_admin only */}
          {isCreatorAdmin(role) && (
            <div style={LINK_GROUP_STYLE}>
              <div style={{ ...LINK_GROUP_LABEL, color: 'rgba(245,166,35,0.5)' }}>Admin</div>
              <div style={LINK_GRID}>
                <AdminLink to="/admin">Admin Dashboard</AdminLink>
                <AdminLink to="/admin/event-requests">Event Requests</AdminLink>
                <AdminLink to="/admin/winner-approval">Winner Approval</AdminLink>
                <AdminLink to="/admin/payouts">Payouts</AdminLink>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Go Live panel (own profile only) ────────────────────── */}
      {isOwn && (
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">📡 Go Live</h2>
          <div style={{
            background: 'rgba(248,113,113,0.05)',
            border: '1px solid rgba(248,113,113,0.15)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
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
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'rgba(220,220,235,0.85)',
                  padding: '0.55rem 0.85rem',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '220px',
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
                  transition: 'background 0.2s',
                  flexShrink: 0,
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

            {/* Preview */}
            {goLiveUrl && (
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.35)', marginBottom: '0.5rem' }}>Preview</p>
                <LivePlayer url={goLiveUrl} label="Preview" />
              </div>
            )}
          </div>
        </div>
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

      {/* Upcoming events */}
      {events.length > 0 && (
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">📅 Events</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {events.map((ev) => (
              <Link key={ev.id} to={`/events/${ev.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none', transition: 'border-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(110,168,255,0.3)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
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

      {/* Tip Jar */}
      {!isOwn && <TipJar creatorName={displayName} />}
    </div>
  );
}
