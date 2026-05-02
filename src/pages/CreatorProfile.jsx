import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
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
        <p style={{ color:'#86efac', fontWeight:600 }}>Thank you for your support! 🙏</p>
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

export default function CreatorProfile() {
  const { id } = useParams();
  const { user } = useAuth();

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

  if (loading) return (
    <div className="portfolio-page" style={{ textAlign:'center', paddingTop:'4rem' }}>
      <div className="cinematic-spinner" />
    </div>
  );

  if (!profile) return (
    <div className="portfolio-page" style={{ textAlign:'center', paddingTop:'4rem' }}>
      <p style={{ color:'rgba(200,200,215,0.5)' }}>Creator not found.</p>
    </div>
  );

  const displayName = profile.display_name || profile.username || 'Creator';
  const initial     = displayName[0]?.toUpperCase() ?? '?';
  const socialLinks = profile.social_links || {};
  const isOwn       = user?.id === profile.id;

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
            ? <img src={profile.avatar_url} alt={displayName} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
            : initial}
        </div>

        <div className="portfolio-identity">
          <h1 className="portfolio-name">{displayName}</h1>
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

      {/* Sessions gallery */}
      {sessions.length > 0 && (
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">🎬 Sessions</h2>
          <div className="portfolio-sessions-grid">
            {sessions.map((s) => (
              <Link key={s.id} to={`/session/${s.id}`} className="portfolio-session-card">
                {s.thumbnail_url
                  ? <img src={s.thumbnail_url} alt={s.title} className="portfolio-session-thumb" loading="lazy" />
                  : <div className="portfolio-session-thumb" style={{ background:'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem' }}>🎬</div>
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
          <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
            {events.map((ev) => (
              <Link key={ev.id} to={`/events/${ev.id}`}
                style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.875rem 1rem', borderRadius:'12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', textDecoration:'none', transition:'border-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.borderColor='rgba(110,168,255,0.3)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}
              >
                {ev.thumbnail_url && (
                  <img src={ev.thumbnail_url} alt={ev.title} style={{ width:'64px', height:'48px', objectFit:'cover', borderRadius:'8px', flexShrink:0 }} />
                )}
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:'0.9rem', fontWeight:600, color:'var(--text-soft)' }}>{ev.title}</p>
                  {ev.is_paid_event && (
                    <p style={{ margin:'0.1rem 0 0', fontSize:'0.78rem', color:'var(--accent-gold)' }}>
                      ${ev.ticket_price} ticket
                    </p>
                  )}
                </div>
                <span style={{ fontSize:'0.8rem', color:'rgba(200,200,215,0.4)' }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Shop (placeholder) */}
      <div className="portfolio-section">
        <h2 className="portfolio-section-title">🛍 Shop</h2>
        <div className="portfolio-shop-grid">
          {[
            { name:'Preset Pack',   price:'$12' },
            { name:'Template Kit',  price:'$24' },
            { name:'Sample Pack',   price:'$8'  },
          ].map((item) => (
            <div key={item.name} className="portfolio-product-card">
              <p className="portfolio-product-name">{item.name}</p>
              <p className="portfolio-product-price">{item.price}</p>
              <button className="portfolio-cta portfolio-cta--secondary" style={{ fontSize:'0.8rem', padding:'0.35rem 0.75rem', cursor:'pointer' }}>
                Buy
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tip Jar */}
      {!isOwn && <TipJar creatorName={displayName} />}
    </div>
  );
}
