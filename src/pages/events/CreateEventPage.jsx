import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import EarningsCalculator from '../../components/events/EarningsCalculator';

const MEMBERSHIP_COST = 15;

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    is_paid_event: false,
    ticket_price: '',
    stage_room_id: '',
    starts_at: '',
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const showCalculator =
    form.is_paid_event &&
    Number(form.ticket_price) > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) { setErrorMsg('You must be signed in.'); return; }
    if (!form.title.trim()) { setErrorMsg('Title is required.'); return; }

    setSaving(true);
    setErrorMsg('');

    const roomId = form.stage_room_id.trim() || `room-${Date.now()}`;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      is_paid_event: form.is_paid_event,
      ticket_price: form.is_paid_event ? Number(form.ticket_price) : null,
      stage_room_id: roomId,
      creator_id: user.id,
      starts_at: form.starts_at || null,
    };

    const { data, error } = await supabase
      .from('events')
      .insert(payload)
      .select('id')
      .single();

    setSaving(false);

    if (error) { setErrorMsg(error.message); return; }

    navigate(`/events/${data.id}`);
  }

  return (
    <div className="cinematic-layout cinematic-fade">
      <h2 className="cinematic-title">✦ Create Event</h2>

      <form onSubmit={handleSubmit}>
        <div className="cinematic-card-xl" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div>
            <label className="cinematic-label">Event Title *</label>
            <input
              className="cinematic-input"
              placeholder="e.g. Midnight Q&A with the Creator"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="cinematic-label">Description</label>
            <textarea
              className="cinematic-textarea"
              placeholder="What will happen at this event?"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="cinematic-label">Thumbnail URL</label>
            <input
              className="cinematic-input"
              placeholder="https://..."
              value={form.thumbnail_url}
              onChange={(e) => set('thumbnail_url', e.target.value)}
            />
          </div>

          <div>
            <label className="cinematic-label">Start Time</label>
            <input
              type="datetime-local"
              className="cinematic-input"
              value={form.starts_at}
              onChange={(e) => set('starts_at', e.target.value)}
            />
          </div>

          <div>
            <label className="cinematic-label">Stage Room ID</label>
            <input
              className="cinematic-input"
              placeholder="Auto-generated if left blank"
              value={form.stage_room_id}
              onChange={(e) => set('stage_room_id', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="checkbox"
              id="is_paid"
              checked={form.is_paid_event}
              onChange={(e) => set('is_paid_event', e.target.checked)}
              style={{ accentColor: 'var(--accent-blue)', width: '1rem', height: '1rem', cursor: 'pointer' }}
            />
            <label htmlFor="is_paid" className="cinematic-label" style={{ margin: 0, cursor: 'pointer' }}>
              Paid event
            </label>
          </div>

          {form.is_paid_event && (
            <div>
              <label className="cinematic-label">Ticket Price (USD)</label>
              <input
                type="number"
                min="0.50"
                step="0.01"
                className="cinematic-input"
                placeholder="e.g. 5.00"
                value={form.ticket_price}
                onChange={(e) => set('ticket_price', e.target.value)}
                style={{ maxWidth: '160px' }}
              />
            </div>
          )}

          {showCalculator && (
            <div className="cinematic-section" style={{ marginTop: '0.25rem' }}>
              <h3 className="cinematic-subtitle" style={{ marginBottom: '1rem', fontSize: '0.9rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Potential Earnings
              </h3>
              <EarningsCalculator
                ticketPrice={Number(form.ticket_price)}
                membershipCost={MEMBERSHIP_COST}
              />
            </div>
          )}

          {errorMsg && (
            <p style={{ color: 'var(--color-error, #f87171)', fontSize: '0.85rem', margin: 0 }}>
              {errorMsg}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="cinematic-button"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cinematic-button-accent"
              disabled={saving}
            >
              {saving ? 'Creating…' : 'Create Event'}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
