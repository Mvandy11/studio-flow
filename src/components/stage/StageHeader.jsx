import ViewerCount from './ViewerCount';

export default function StageHeader({ event, viewerCount, onLeave }) {
  const host = event?.host_profile; 
  // Expecting event.host_profile = { display_name, avatar_url, membership_active, membership_tier }

  function getMembershipLabel() {
    if (!host) return '';
    if (host.membership_active) {
      if (host.membership_tier === 'creator_50') return 'Creator Member';
      if (host.membership_tier === 'member_30') return 'Member';
    }
    return 'Free Member';
  }

  return (
    <div className="stage-header">
      {event?.thumbnail_url && (
        <div
          className="stage-thumbnail-strip"
          style={{ backgroundImage: `url(${event.thumbnail_url})` }}
          aria-hidden="true"
        />
      )}

      <div className="stage-header-inner">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            className="cinematic-title"
            style={{
              fontSize: '1.2rem',
              marginBottom: '0.3rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {event?.title ?? 'Live Stage'}
          </h1>

          {/* Host Info */}
          {host && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <img
                src={host.avatar_url}
                alt={host.display_name}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(255,255,255,0.4)'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{host.display_name}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{getMembershipLabel()}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="stage-live-badge">● LIVE</span>
            <ViewerCount count={viewerCount} />
          </div>
        </div>

        <button
          className="cinematic-button"
          style={{ flexShrink: 0, fontSize: '0.85rem' }}
          onClick={onLeave}
        >
          ← Leave
        </button>
      </div>
    </div>
  );
}
