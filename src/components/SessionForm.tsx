import { useState } from 'react';
import type { Session } from '../mock/seed';

type SessionDraft = Omit<Session, 'id' | 'creator_id' | 'created_at'>;

interface SessionFormProps {
  initial?: Partial<SessionDraft>;
  onSave: (data: SessionDraft) => void;
  onCancel?: () => void;
  saving?: boolean;
}

const MOCK_THUMBNAILS = [
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&q=80',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&q=80',
  'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=80',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80',
  'https://images.unsplash.com/photo-1519214605650-76a613ee3245?w=400&q=80',
];

export default function SessionForm({ initial = {}, onSave, onCancel, saving }: SessionFormProps) {
  const [form, setForm] = useState<SessionDraft>({
    title: initial.title ?? '',
    description: initial.description ?? '',
    thumbnail_url: initial.thumbnail_url ?? MOCK_THUMBNAILS[0],
    status: initial.status ?? 'draft',
    scheduled_at: initial.scheduled_at,
  });

  const [showPicker, setShowPicker] = useState(false);

  function patch<K extends keyof SessionDraft>(key: K, value: SessionDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <div>
        <label className="cinematic-label">Title *</label>
        <input
          className="cinematic-input"
          value={form.title}
          onChange={(e) => patch('title', e.target.value)}
          placeholder="Give your session a cinematic name…"
          required
        />
      </div>

      <div>
        <label className="cinematic-label">Description</label>
        <textarea
          className="cinematic-textarea"
          value={form.description}
          onChange={(e) => patch('description', e.target.value)}
          placeholder="What will this session be about?"
          rows={3}
        />
      </div>

      <div>
        <label className="cinematic-label">Thumbnail</label>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.4rem' }}>
          {form.thumbnail_url && (
            <img
              src={form.thumbnail_url}
              alt="thumbnail"
              style={{ width: '80px', height: '52px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          )}
          <button
            type="button"
            className="cinematic-button"
            style={{ fontSize: '0.8rem' }}
            onClick={() => setShowPicker(!showPicker)}
          >
            {showPicker ? 'Close' : 'Pick Thumbnail'}
          </button>
        </div>

        {showPicker && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
            {MOCK_THUMBNAILS.map((url) => (
              <img
                key={url}
                src={url}
                alt=""
                style={{
                  width: '100%', height: '60px', objectFit: 'cover',
                  borderRadius: '6px', cursor: 'pointer',
                  border: form.thumbnail_url === url ? '2px solid #4f8ef7' : '2px solid transparent',
                  transition: 'border-color 0.15s',
                }}
                onClick={() => { patch('thumbnail_url', url); setShowPicker(false); }}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="cinematic-label">Status</label>
        <div className="cinematic-radio-group" style={{ marginTop: '0.4rem' }}>
          {(['draft', 'published', 'scheduled'] as const).map((s) => (
            <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="radio"
                name="status"
                value={s}
                checked={form.status === s}
                onChange={() => patch('status', s)}
              />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {form.status === 'scheduled' && (
        <div>
          <label className="cinematic-label">Scheduled At</label>
          <input
            type="datetime-local"
            className="cinematic-input"
            value={form.scheduled_at?.slice(0, 16) ?? ''}
            onChange={(e) => patch('scheduled_at', e.target.value)}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
        {onCancel && (
          <button type="button" className="cinematic-button" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="cinematic-button-accent" disabled={saving}>
          {saving ? 'Saving…' : 'Save Session'}
        </button>
      </div>
    </form>
  );
}
