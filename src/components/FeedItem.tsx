import type { FeedEvent } from '../mock/seed';
import { mockSupabase } from '../mock/supabase';

const TYPE_ICON: Record<FeedEvent['type'], string> = {
  session_went_live: '🔴',
  session_published:  '✅',
  session_created:    '📝',
  reaction:           '🔥',
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface FeedItemProps {
  event: FeedEvent;
}

export default function FeedItem({ event }: FeedItemProps) {
  const creator = mockSupabase.getCreator(event.creator_id);

  return (
    <div
      className="cinematic-card cinematic-fade"
      style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', padding: '0.9rem 1rem' }}
    >
      <span style={{ fontSize: '1.3rem', lineHeight: 1, flexShrink: 0, marginTop: '0.1rem' }}>
        {TYPE_ICON[event.type]}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {creator && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <img
              src={creator.avatar_url}
              alt={creator.name}
              style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0 }}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c0c0e0' }}>
              {creator.name}
            </span>
          </div>
        )}
        <p style={{ fontSize: '0.85rem', color: '#b0b0c8', margin: 0, lineHeight: 1.5 }}>
          {event.message}
        </p>
      </div>

      <span style={{ fontSize: '0.72rem', color: '#666', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {timeAgo(event.created_at)}
      </span>
    </div>
  );
}
