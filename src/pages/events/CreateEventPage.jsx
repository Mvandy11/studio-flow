import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isCreatorAdmin } from '../../lib/roles';
import { supabase } from '../../lib/supabaseClient';
import { api } from '../../lib/api.js';
import EarningsCalculator from '../../components/events/EarningsCalculator';
import BackstagePassToggle from '../../components/events/BackstagePassToggle';

const MEMBERSHIP_COST = 15;

const MODE_OPTIONS = [
  { value: 'live',     label: '📡 Live Stream', desc: 'Real-time broadcast with a stage room' },
  { value: 'recorded', label: '🎬 Pre-Recorded',  desc: 'Upload a video for on-demand viewing' },
];

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isSubscribed = isCreatorAdmin(role) || !!user?.profile?.subscription_active;

  const [form, setForm] = useState({
    title:           '',
    description:     '',
    thumbnail_url:   '',
    event_mode:      'live',
    is_paid_event:   false,
    ticket_price:    '',
    stage_room_id:   '',
    starts_at:       '',
    video_url:       '',
    live_stream_url: '',
    drawing_enabled: false,
    drawing_amount:  '',
  });
  const [backstagePass, setBackstagePass] = useState(false);
  const [seatLimit,     setSeatLimit]     = useState(50);
  const [saving,        setSaving]        = useState(false);
  const [errorMsg,      setErrorMsg]      = useState('');

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isLive     = form.event_mode === 'live';
  const isRecorded = form.event_mode === 'recorded';
  const showCalc   = form.is_paid_event && Number(form.ticket_price) > 0;
  const bpEnabled  = form.is_paid_event && Number(form.ticket_price) > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user)              { setErrorMsg('You must be signed in.');  return; }
    if (!isSubscribed)      { setErrorMsg('An active subscription is required to create events.'); return; }
    if (!form.title.trim()) { setErrorMsg('Title is required.');      return; }
    if (backstagePass && bpEnabled && seatLimit < 1) {
      setErrorMsg('Seat limit must be at least 1.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      // Admin users go through the API (auth-protected, event_mode support)
      if (isCreatorAdmin(role)) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const roomId = isLive
          ? (form.stage_room_id.trim() || `room-${Date.now()}`)
          : null;

        const result = await api('/api/events', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title:           form.title.trim(),
            description:     form.description.trim() || null,
            thumbnail_url:   form.thumbnail_url.trim() || null,
            event_mode:      form.event_mode,
            is_paid:         form.is_paid_event,
            price:           form.is_paid_event ? Number(form.ticket_price) : 0,
            stage_room_id:   roomId,
            live_room_id:    roomId,
            starts_at:       form.starts_at || null,
            start_time:      form.starts_at || null,
            video_url:       isRecorded ? form.video_url.trim() || null : null,
            live_stream_url: isLive ? form.live_stream_url.trim() || null : null,
            status:          'upcoming',
            drawing_enabled: form.is_paid_event && form.drawing_enabled,
            drawing_amount:  form.is_paid_event && form.drawing_enabled && form.drawing_amount
              ? Number(form.drawing_amount)
              : null,
          }),
        });

        navigate(`/events/${result.data.id}`);
        return;
      }

      // Regular users use Supabase directly (legacy path)
      const roomId = form.stage_room_id.trim() || `room-${Date.now()}`;
      const { data, error } = await supabase
        .from('events')
        .insert({
          title:           form.title.trim(),
          description:     form.description.trim() || null,
          thumbnail_url:   form.thumbnail_url.trim() || null,
          event_mode:      form.event_mode,
          is_paid_event:   form.is_paid_event,
          ticket_price:    form.is_paid_event ? Number(form.ticket_price) : null,
          stage_room_id:   roomId,
          creator_id:      user.id,
          starts_at:       form.starts_at || null,
          live_stream_url: isLive ? form.live_stream_url.trim() || null : null,
          drawing_enabled: form.is_paid_event && form.drawing_enabled,
          drawing_amount:  form.is_paid_event && form.drawing_enabled && form.drawing_amount
            ? Number(form.drawing_amount)
            : null,
          ...(backstagePass && bpEnabled
            ? { backstage_pass: true, seat_limit: seatLimit }
            : { backstage_pass: false, seat_limit: null }),
        })
        .select('id')
        .single();

      if (error) throw error;
      navigate(`/events/${data.id}`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cinematic-layout cinematic-fade">
      <h2 className="cinematic-title">✦ Create Event</h2>

      {user && !isSubscribed && (
        <div style={{ padding:'1.25rem', borderRadius:'12px', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.25)', marginBottom:'1.5rem' }}>
          <p style={{ margin:'0 0 0.5rem', fontWeight:600, color:'#fbbf24' }}>🔒 Subscription Required</p>
          <p style={{ margin:'0 0 0.75rem', fontSize:'0.875rem', color:'rgba(255,255,255,0.7)' }}>
            An active Studio Flow subscription is needed to create events.
          </p>
          <a href="/subscription" className="btn btn--primary" style={{ fontSize:'0.875rem', textDecoration:'none' }}>
            Upgrade your plan →
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="cinematic-card-xl" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Event Mode */}
          <div>
            <label className="cinematic-label">Event Mode *</label>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('event_mode', opt.value)}
                  style={{
                    flex: 1, minWidth: '160px',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: form.event_mode === opt.value
                      ? '1px solid rgba(245,166,35,0.5)'
                      : '1px solid rgba(255,255,255,0.1)',
                    background: form.event_mode === opt.value
                      ? 'rgba(245,166,35,0.08)'
                      : 'rgba(255,255,255,0.03)',
                    color: form.event_mode === opt.value ? '#f5a623' : 'rgba(200,200,215,0.7)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.65 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

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
            <label className="cinematic-label">
              {isLive ? 'Start Date & Time' : 'Release Date (optional)'}
            </label>
            <input
              type="datetime-local"
              className="cinematic-input"
              value={form.starts_at}
              onChange={(e) => set('starts_at', e.target.value)}
            />
          </div>

          {/* Live-only: Stage Room ID */}
          {isLive && (
            <div>
              <label className="cinematic-label">Stage Room ID</label>
              <input
                className="cinematic-input"
                placeholder="Auto-generated if left blank"
                value={form.stage_room_id}
                onChange={(e) => set('stage_room_id', e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)', marginTop: '0.3rem' }}>
                Used to route viewers to the correct live stage.
              </p>
            </div>
          )}

          {/* Live-only: External stream URL */}
          {isLive && (
            <div>
              <label className="cinematic-label">
                Livestream URL <span style={{ color: 'rgba(200,200,215,0.35)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                className="cinematic-input"
                placeholder="Paste your live stream URL — TikTok, YouTube, Twitch, Instagram, Kick, etc."
                value={form.live_stream_url}
                onChange={(e) => set('live_stream_url', e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)', marginTop: '0.3rem' }}>
                Paste your live stream link from any platform — TikTok, YouTube, Twitch, Instagram, Facebook, Kick, or any other streaming service. Viewers will be directed to your stream to support your algorithm.
              </p>
            </div>
          )}

          {/* Recorded-only: Video URL */}
          {isRecorded && (
            <div>
              <label className="cinematic-label">Video URL</label>
              <input
                className="cinematic-input"
                placeholder="YouTube, Vimeo, or direct video URL"
                value={form.video_url}
                onChange={(e) => set('video_url', e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)', marginTop: '0.3rem' }}>
                Supports YouTube, Vimeo, and direct .mp4 links.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="checkbox"
              id="is_paid"
              checked={form.is_paid_event}
              onChange={(e) => { set('is_paid_event', e.target.checked); if (!e.target.checked) setBackstagePass(false); }}
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

          {/* Drawing Pot — only when paid event */}
          {form.is_paid_event && (
            <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: form.drawing_enabled ? '1rem' : 0 }}>
                <input
                  type="checkbox"
                  id="drawing_enabled"
                  checked={form.drawing_enabled}
                  onChange={(e) => set('drawing_enabled', e.target.checked)}
                  style={{ accentColor: '#f5a623', width: '1rem', height: '1rem', cursor: 'pointer' }}
                />
                <label htmlFor="drawing_enabled" className="cinematic-label" style={{ margin: 0, cursor: 'pointer', color: '#f5a623' }}>
                  🎰 Enable Drawing Pot
                </label>
              </div>
              {form.drawing_enabled && (
                <div>
                  <label className="cinematic-label">Drawing Pot Amount per Ticket (USD)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="cinematic-input"
                    placeholder="e.g. 5.00"
                    value={form.drawing_amount}
                    onChange={(e) => set('drawing_amount', e.target.value)}
                    style={{ maxWidth: '160px' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)', marginTop: '0.3rem' }}>
                    This amount from each ticket goes into the prize pot. Every ticket = 1 entry.
                    {form.drawing_amount && form.ticket_price && Number(form.drawing_amount) > 0 && (
                      <> Total pot grows by <strong style={{ color: '#f5a623' }}>${Number(form.drawing_amount).toFixed(2)}</strong> per ticket sold.</>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {isLive && (
            <BackstagePassToggle
              backstagePass={backstagePass}
              setBackstagePass={setBackstagePass}
              seatLimit={seatLimit}
              setSeatLimit={setSeatLimit}
              disabled={!bpEnabled}
            />
          )}

          {showCalc && (
            <div className="cinematic-section" style={{ marginTop: '0.25rem' }}>
              <h3 className="cinematic-subtitle" style={{ marginBottom: '1rem', fontSize: '0.9rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Potential Earnings
              </h3>
              <EarningsCalculator ticketPrice={Number(form.ticket_price)} membershipCost={MEMBERSHIP_COST} />
            </div>
          )}

          {errorMsg && (
            <p style={{ color: 'var(--color-error, #f87171)', fontSize: '0.85rem', margin: 0 }}>
              {errorMsg}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="cinematic-button" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="cinematic-button-accent" disabled={saving}>
              {saving ? 'Creating…' : isLive ? '📡 Create Live Event' : '🎬 Create Recorded Event'}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
