import ViewerCount from './ViewerCount';

export default function StageHeader({ event, viewerCount, onLeave }) {
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
            style={{ fontSize: '1.2rem', marginBottom: '0.3rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {event?.title ?? 'Live Stage'}
          </h1>
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
