import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth }            from '../../hooks/useAuth';
import { useMembership }      from '../../modules/memberships';
import { isCreatorAdmin }     from '../../lib/roles';

const CATEGORY_ICONS = {
  Comedy: '😂', Music: '🎵', Dance: '💃', Fitness: '💪',
  Gaming: '🎮', Education: '📚', Cooking: '🍳', Motivation: '🔥',
  Kids: '🧸', 'Talk Show': '🎙', Tutorials: '🛠', Art: '🎨',
};

const TYPE_FILTERS = [
  { value: '',       label: 'All' },
  { value: 'live',   label: '📡 Live' },
  { value: 'video',  label: '🎬 Video' },
];

const DONATION_URL = 'https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t';

export default function CategoryEventsPage() {
  const { category }   = useParams();
  const navigate       = useNavigate();
  const { role }       = useAuth();
  const { tier }       = useMembership();

  const isAdmin     = isCreatorAdmin(role);
  const isCreator50 = tier === 'creator_50' || isAdmin;
  const isMember30  = tier === 'member_30';
  const canWatch    = isMember30 || isCreator50;

  const [slots,      setSlots]      = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const decodedCat = decodeURIComponent(category || '');
  const icon       = CATEGORY_ICONS[decodedCat] || '🎬';

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const url = `/api/creator/events/public?category=${encodeURIComponent(decodedCat)}`;
        const res  = await fetch(url);
        if (!res.ok) throw new Error('Failed to load events');
        const data = await res.json();
        setSlots(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [decodedCat]);

  const filtered = slots.filter((s) => {
    if (!typeFilter) return true;
    if (typeFilter === 'live')  return s.is_live || s.status === 'live';
    if (typeFilter === 'video') return !s.is_live && s.status !== 'live';
    return true;
  });

  return (
    <div className="page-container">

      {/* ── Breadcrumb ── */}
      <div style={{ marginBottom: '1.25rem', fontSize: '0.8rem', color: 'rgba(200,200,215,0.4)' }}>
        <Link to="/events" style={{ color: 'rgba(200,200,215,0.4)', textDecoration: 'none' }}>Events</Link>
        <span style={{ margin: '0 0.5rem' }}>›</span>
        <span style={{ color: 'rgba(200,200,215,0.75)' }}>{decodedCat}</span>
      </div>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.8rem' }}>{icon}</span>
            {decodedCat}
          </h1>
          <p className="page-subtitle">
            Live and on-demand events in the {decodedCat} category.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {isCreator50 && (
            <Link to="/creator/new-event" className="btn btn--primary" style={{ textDecoration: 'none', flexShrink: 0 }}>
              + Post Event
            </Link>
          )}
          <Link to="/events" className="btn" style={{ textDecoration: 'none', flexShrink: 0 }}>
            ← All Categories
          </Link>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={`ai-grid__filter${typeFilter === f.value ? ' ai-grid__filter--active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Free user upgrade banner ── */}
      {!canWatch && (
        <div style={upgradeBanner}>
          <div>
            <p style={{ fontWeight: 700, margin: '0 0 0.25rem', fontSize: '0.95rem' }}>🔒 Members watch everything</p>
            <p style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.825rem', margin: 0 }}>
              Upgrade to Member to watch any event in full. Free forever for browsing.
            </p>
          </div>
          <Link to="/membership" className="btn btn--primary" style={{ textDecoration: 'none', flexShrink: 0 }}>
            Upgrade to Watch →
          </Link>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fca5a5', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* ── Grid ── */}
      {loading ? (
        <div style={grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '270px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={emptyState}>
          <p style={{ fontSize: '3rem', margin: '0 0 0.75rem' }}>{icon}</p>
          <p style={{ fontWeight: 700, marginBottom: '0.4rem' }}>No {decodedCat} events yet</p>
          <p style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            {isCreator50
              ? 'Be the first to post a ' + decodedCat + ' event.'
              : 'Check back soon — creators are working on it.'}
          </p>
          {isCreator50 && (
            <Link to="/creator/new-event" className="btn btn--primary" style={{ textDecoration: 'none' }}>
              + Post {decodedCat} Event
            </Link>
          )}
        </div>
      ) : (
        <div style={grid}>
          {filtered.map((slot) => (
            <SlotCard key={slot.id} slot={slot} canWatch={canWatch} />
          ))}
        </div>
      )}

      {/* ── Browse more categories ── */}
      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <Link to="/events" style={{ fontSize: '0.875rem', color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>
          ← Browse all categories
        </Link>
      </div>
    </div>
  );
}

function SlotCard({ slot, canWatch }) {
  const isLive      = slot.is_live || slot.status === 'live';
  const creator     = slot.profiles;
  const displayName = creator?.display_name || creator?.username || 'Creator';

  return (
    <Link to={`/event/${slot.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={cardStyle}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = isLive ? 'rgba(239,68,68,0.4)' : 'rgba(167,139,250,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; }}
      >
        {/* Thumbnail */}
        <div style={thumbBox(isLive)}>
          {slot.thumbnail_url
            ? <img src={slot.thumbnail_url} alt={slot.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            : <span style={{ fontSize: '2.5rem' }}>{isLive ? '📡' : '🎬'}</span>}
          {isLive && <LiveBadge />}
          {!canWatch && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1.5rem', margin: '0 0 0.25rem' }}>🔒</p>
                <Link
                  to="/membership"
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(245,166,35,0.9)', color: '#000', padding: '0.3rem 0.75rem', borderRadius: '999px', textDecoration: 'none' }}
                >
                  Upgrade to Watch
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '0.875rem 1rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <Pill bg={isLive ? 'rgba(239,68,68,0.12)' : 'rgba(52,211,153,0.1)'} color={isLive ? '#f87171' : '#34d399'}>
              {isLive ? '🔴 Live' : '🎬 Video'}
            </Pill>
            <Pill bg="rgba(34,197,94,0.1)" color="#22c55e">Free Entry</Pill>
          </div>
          <p style={{ margin: '0 0 0.3rem', fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.3 }}>{slot.title}</p>
          {slot.description && (
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'rgba(200,200,215,0.45)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {slot.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(200,200,215,0.35)' }}>by {displayName}</p>
            <a
              href={`https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: '0.7rem', color: '#f5a623', textDecoration: 'none', fontWeight: 600 }}
            >
              💝 Donate
            </a>
          </div>
        </div>
      </div>
    </Link>
  );
}

function Pill({ children, color, bg }) {
  return (
    <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, background: bg, color, border: `1px solid ${color}44` }}>
      {children}
    </span>
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
const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '1.25rem',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px', overflow: 'hidden',
  transition: 'border-color 0.2s, transform 0.2s',
  height: '100%',
};

function thumbBox(isLive) {
  return {
    width: '100%', aspectRatio: '16/9',
    background: `linear-gradient(135deg, ${isLive ? '#16213e, #1a1a3e' : '#1a1a2e, #16213e'})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  };
}

const emptyState = {
  textAlign: 'center',
  background: 'rgba(255,255,255,0.02)',
  border: '1px dashed rgba(255,255,255,0.08)',
  borderRadius: '16px', padding: '3.5rem 2rem',
};

const upgradeBanner = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: '1rem', flexWrap: 'wrap',
  background: 'linear-gradient(135deg, rgba(245,166,35,0.07), rgba(167,139,250,0.07))',
  border: '1px solid rgba(245,166,35,0.2)',
  borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.75rem',
};
