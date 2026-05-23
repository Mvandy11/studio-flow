import { useEffect, useState } from 'react';
import { Link }               from 'react-router-dom';
import { useAuth }            from '../../hooks/useAuth';
import { useMembership }      from '../../modules/memberships';
import { isCreatorAdmin }     from '../../lib/roles';

const CATEGORIES = [
  { name: 'Comedy',     icon: '😂' },
  { name: 'Music',      icon: '🎵' },
  { name: 'Dance',      icon: '💃' },
  { name: 'Fitness',    icon: '💪' },
  { name: 'Gaming',     icon: '🎮' },
  { name: 'Education',  icon: '📚' },
  { name: 'Cooking',    icon: '🍳' },
  { name: 'Motivation', icon: '🔥' },
  { name: 'Kids',       icon: '🧸' },
  { name: 'Talk Show',  icon: '🎙' },
  { name: 'Tutorials',  icon: '🛠' },
  { name: 'Art',        icon: '🎨' },
];

const DONATION_URL = 'https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t';

export default function EventsPage() {
  const { role }            = useAuth();
  const { tier }            = useMembership();
  const isAdmin             = isCreatorAdmin(role);
  const isCreator50         = tier === 'creator_50' || isAdmin;

  const [featured, setFeatured] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch('/api/creator/events/public');
        const data = await res.json();
        setFeatured(Array.isArray(data) ? data.slice(0, 6) : []);
      } catch (_) {
        setFeatured([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="page-container">

      {/* ── Hero ── */}
      <div style={heroStyle}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#f5a623', marginBottom: '0.75rem' }}>
            Studio Flow · Live & On-Demand
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 1rem', background: 'linear-gradient(135deg, #fff 40%, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Discover Events
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(200,200,215,0.7)', maxWidth: '520px', lineHeight: 1.6, margin: '0 0 2rem' }}>
            Explore live and on-demand events across every category.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isCreator50 && (
              <Link to="/creator/new-event" className="btn btn--primary" style={{ textDecoration: 'none' }}>
                + Post Event
              </Link>
            )}
            <a href={DONATION_URL} target="_blank" rel="noopener noreferrer" className="btn" style={{ textDecoration: 'none' }}>
              💝 Support a Creator
            </a>
          </div>
        </div>

        {/* Decorative blur orbs */}
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '30%', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,166,35,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      </div>

      {/* ── Category Grid ── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={sectionTitle}>Browse by Category</h2>
        <div style={catGrid}>
          {CATEGORIES.map(({ name, icon }) => (
            <Link key={name} to={`/events/${encodeURIComponent(name)}`} style={{ textDecoration: 'none' }}>
              <div style={catCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(245,166,35,0.4)';
                  e.currentTarget.style.background  = 'rgba(245,166,35,0.07)';
                  e.currentTarget.style.transform   = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.background  = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.transform   = 'none';
                }}
              >
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>{icon}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(200,200,215,0.85)' }}>{name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Events (latest creator slots) ── */}
      {(loading || featured.length > 0) && (
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={sectionTitle}>🌟 Featured Events</h2>
          </div>
          {loading ? (
            <div style={grid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: '220px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease infinite' }} />
              ))}
            </div>
          ) : (
            <div style={grid}>
              {featured.map((slot) => (
                <FeaturedCard key={slot.id} slot={slot} tier={tier} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Upgrade CTA for free users ── */}
      {tier !== 'member_30' && tier !== 'creator_50' && !isAdmin && (
        <div style={upgradeBanner}>
          <div>
            <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>🌟 Unlock Full Access</p>
            <p style={{ color: 'rgba(200,200,215,0.6)', fontSize: '0.875rem', margin: 0 }}>
              Become a member to watch full events and enter contests.
            </p>
          </div>
          <Link to="/membership" className="btn btn--primary" style={{ textDecoration: 'none', flexShrink: 0 }}>
            Upgrade →
          </Link>
        </div>
      )}
    </div>
  );
}

function FeaturedCard({ slot, tier }) {
  const isAdmin     = false;
  const canWatch    = tier === 'member_30' || tier === 'creator_50' || isAdmin;
  const isLive      = slot.is_live || slot.status === 'live';
  const creator     = slot.profiles;
  const displayName = creator?.display_name || creator?.username || 'Creator';

  return (
    <Link to={`/event/${slot.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', position: 'relative' }}>
      <div style={featCard}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; }}
      >
        <div style={thumbBox(isLive)}>
          {slot.thumbnail_url
            ? <img src={slot.thumbnail_url} alt={slot.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            : <span style={{ fontSize: '2.5rem' }}>{isLive ? '📡' : '🎬'}</span>}
          {isLive && <LiveBadge />}
          {!canWatch && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(245,166,35,0.9)', color: '#000', padding: '0.3rem 0.75rem', borderRadius: '999px' }}>🔒 Members Only</span>
            </div>
          )}
        </div>
        <div style={{ padding: '0.875rem 1rem' }}>
          {slot.category && (
            <span style={catPillStyle}>{slot.category}</span>
          )}
          <p style={{ margin: '0.4rem 0 0.25rem', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.3 }}>{slot.title}</p>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(200,200,215,0.4)' }}>by {displayName}</p>
        </div>
      </div>
    </Link>
  );
}

function LiveBadge() {
  return (
    <span style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      ● Live
    </span>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */
const heroStyle = {
  position: 'relative', overflow: 'hidden',
  background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(245,166,35,0.05) 100%)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '20px', padding: 'clamp(2rem, 5vw, 3.5rem)',
  marginBottom: '2.5rem',
};

const sectionTitle = {
  fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1.25rem',
  color: 'rgba(200,200,215,0.85)',
};

const catGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
  gap: '0.875rem',
};

const catCard = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px',
  padding: '1.25rem 1rem',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.18s',
};

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: '1.125rem',
};

const featCard = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px', overflow: 'hidden',
  transition: 'border-color 0.2s, transform 0.2s',
};

function thumbBox(isLive) {
  return {
    width: '100%', aspectRatio: '16/9',
    background: `linear-gradient(135deg, ${isLive ? '#16213e, #1a1a3e' : '#1a1a2e, #16213e'})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  };
}

const catPillStyle = {
  display: 'inline-block', fontSize: '0.65rem', fontWeight: 700,
  background: 'rgba(245,166,35,0.1)', color: '#f5a623',
  border: '1px solid rgba(245,166,35,0.25)',
  padding: '0.15rem 0.5rem', borderRadius: '999px',
  marginBottom: '0.25rem',
};

const upgradeBanner = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: '1rem', flexWrap: 'wrap',
  background: 'linear-gradient(135deg, rgba(245,166,35,0.08), rgba(167,139,250,0.08))',
  border: '1px solid rgba(245,166,35,0.2)',
  borderRadius: '14px', padding: '1.25rem 1.5rem',
};
