import { Link } from 'react-router-dom';
import { useMembership } from '../modules/memberships/useMembership';

export default function EducationPage() {
  const { tier } = useMembership();
  const isCreator50 = tier === 'creator_50';

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">🎓 Education</h1>
        <p className="page-subtitle">
          Host a class, workshop, or skill session for the Studio Flow community.
          Creator_50 members can publish education events directly — no approval needed.
        </p>
      </div>

      <div style={{
        maxWidth: '560px', margin: '0 auto',
        display: 'flex', flexDirection: 'column', gap: '1.25rem',
      }}>
        {isCreator50 ? (
          <div style={{
            padding: '1.75rem', borderRadius: '16px',
            background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎬</p>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              Ready to teach?
            </h2>
            <p style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Post your education event directly — choose the <strong style={{ color: '#a78bfa' }}>Education</strong> category.
            </p>
            <Link
              to="/creator/new-event"
              style={{
                display: 'inline-block', padding: '0.65rem 1.5rem',
                borderRadius: '10px', background: 'rgba(167,139,250,0.15)',
                border: '1px solid rgba(167,139,250,0.35)',
                color: '#a78bfa', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
              }}
            >
              + Post Education Event
            </Link>
          </div>
        ) : (
          <div style={{
            padding: '1.75rem', borderRadius: '16px',
            background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</p>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              Creator access required
            </h2>
            <p style={{ color: 'rgba(200,200,215,0.5)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Upgrade to the <strong style={{ color: '#a78bfa' }}>Creator_50</strong> plan to host and publish education events.
            </p>
            <Link
              to="/membership"
              style={{
                display: 'inline-block', padding: '0.65rem 1.5rem',
                borderRadius: '10px', background: 'rgba(167,139,250,0.15)',
                border: '1px solid rgba(167,139,250,0.35)',
                color: '#a78bfa', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
              }}
            >
              View Membership Plans
            </Link>
          </div>
        )}

        <div style={{
          padding: '1.25rem 1.5rem', borderRadius: '14px',
          background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            📚 Browse Education Events
          </h3>
          <p style={{ color: 'rgba(200,200,215,0.5)', fontSize: '0.85rem', marginBottom: '0.875rem' }}>
            Watch tutorials, workshops, and skill sessions from community creators.
          </p>
          <Link
            to="/events/category/Education"
            style={{
              display: 'inline-block', padding: '0.5rem 1.1rem',
              borderRadius: '8px', background: 'rgba(96,165,250,0.1)',
              border: '1px solid rgba(96,165,250,0.25)',
              color: '#60a5fa', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none',
            }}
          >
            Browse Education Events →
          </Link>
        </div>
      </div>
    </div>
  );
}
