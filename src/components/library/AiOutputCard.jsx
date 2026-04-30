import { formatDistanceToNow } from 'date-fns';

const TOOL_BADGES = {
  enhance: { label: 'Enhance', color: '#6366f1' },
  denoise: { label: 'Denoise', color: '#0ea5e9' },
  upscale: { label: 'Upscale', color: '#f59e0b' },
};

export default function AiOutputCard({ item, onDelete }) {
  const badge     = TOOL_BADGES[item.tool] || { label: item.tool, color: '#6b7280' };
  const dateLabel = item.created_at
    ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    : '—';

  return (
    <div className="ai-card">
      <div className="ai-card__thumb">
        {item.public_url ? (
          <img src={item.public_url} alt={item.filename} className="ai-card__img" loading="lazy" />
        ) : (
          <div className="ai-card__icon" aria-label="Image file">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>
      <div className="ai-card__body">
        <p className="ai-card__filename" title={item.filename}>{item.filename}</p>
        <div className="ai-card__meta">
          <span className="ai-card__badge" style={{ '--badge-color': badge.color }}>
            {badge.label}
          </span>
          {item.resolution && (
            <span className="ai-card__resolution">{item.resolution}</span>
          )}
          <span className="ai-card__date">{dateLabel}</span>
        </div>
      </div>
      <div className="ai-card__actions">
        {item.public_url && (
          <a href={item.public_url} download={item.filename}
            className="ai-card__action" title="Download">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
        )}
        {onDelete && (
          <button className="ai-card__action ai-card__action--danger"
            onClick={() => onDelete(item.id, item.storage_path)} title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6" /><path d="M14 11v6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
