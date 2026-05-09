import { useState } from 'react';
import { supabase } from '../lib/supabase';
import API_BASE from '../lib/apiBase.js';

/**
 * Shared Custom Event Request form.
 * Used on both the Events page and the Education page.
 */
export default function CustomEventRequestForm() {
  const [title,       setTitle]       = useState('');
  const [eventType,   setEventType]   = useState('open');
  const [price,       setPrice]       = useState('');
  const [description, setDescription] = useState('');
  const [status,      setStatus]      = useState('idle'); // idle | sending | success | error
  const [errorMsg,    setErrorMsg]    = useState('');

  const isLocked = eventType === 'locked';

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMsg('You must be logged in to submit a request.');
        setStatus('error');
        return;
      }

      const res = await fetch(`${API_BASE}/api/custom-events/request`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title:      title.trim(),
          event_type: eventType,
          price:      isLocked && price !== '' ? Number(price) : null,
          description: description.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed.');

      setStatus('success');
      setTitle('');
      setEventType('open');
      setPrice('');
      setDescription('');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div style={successBox}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
        <h3 style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '1.1rem' }}>Request Sent!</h3>
        <p style={{ color: 'var(--text-soft, #8b9fc5)', margin: '0 0 1.25rem', fontSize: '0.9rem' }}>
          Your request has been sent to Studio Flow. We'll review it and get back to you soon.
        </p>
        <button onClick={() => setStatus('idle')} style={secondaryBtn}>
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={formWrap}>
      {/* Title */}
      <div style={fieldGroup}>
        <label style={label} htmlFor="cer-title">Title of Slot <span style={req}>*</span></label>
        <input
          id="cer-title"
          type="text"
          placeholder="e.g. Live Beat Session, Vocal Workshop…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={input}
        />
      </div>

      {/* Event Type */}
      <div style={fieldGroup}>
        <label style={label}>Event Type <span style={req}>*</span></label>
        <div style={radioGroup}>
          <label style={radioLabel}>
            <input
              type="radio"
              name="event_type"
              value="open"
              checked={eventType === 'open'}
              onChange={() => setEventType('open')}
              style={{ marginRight: '0.5rem', accentColor: 'var(--accent-gold, #f5a623)' }}
            />
            Open Event with Donation Option
          </label>
          <label style={radioLabel}>
            <input
              type="radio"
              name="event_type"
              value="locked"
              checked={eventType === 'locked'}
              onChange={() => setEventType('locked')}
              style={{ marginRight: '0.5rem', accentColor: 'var(--accent-gold, #f5a623)' }}
            />
            Locked / Ticketed Event
          </label>
        </div>
      </div>

      {/* Price — shown only for locked events */}
      {isLocked && (
        <div style={fieldGroup}>
          <label style={label} htmlFor="cer-price">Amount Charging ($) <span style={req}>*</span></label>
          <input
            id="cer-price"
            type="number"
            min="1"
            step="0.01"
            placeholder="e.g. 10.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required={isLocked}
            style={input}
          />
        </div>
      )}

      {/* Description */}
      <div style={fieldGroup}>
        <label style={label} htmlFor="cer-desc">Description <span style={{ color: 'var(--text-soft, #8b9fc5)', fontWeight: 400 }}>(optional)</span></label>
        <textarea
          id="cer-desc"
          rows={4}
          placeholder="Tell us about your event — what it is, who it's for, any special details…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ ...input, resize: 'vertical', minHeight: '100px' }}
        />
      </div>

      {/* Error */}
      {status === 'error' && (
        <div style={errorBox}>{errorMsg}</div>
      )}

      <button type="submit" disabled={status === 'sending'} style={submitBtn(status === 'sending')}>
        {status === 'sending' ? 'Sending…' : 'Submit Request'}
      </button>

      <p style={{ marginTop: '0.875rem', fontSize: '0.78rem', color: 'var(--text-soft, #8b9fc5)', textAlign: 'center' }}>
        Studio Flow uses a custom event request system. Once approved, you receive your private event slot, upload password, and payment link (if applicable).
      </p>
    </form>
  );
}

/* ── Styles ── */
const formWrap = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '18px',
  padding: '2rem',
  maxWidth: '600px',
  width: '100%',
};

const fieldGroup = { marginBottom: '1.25rem' };

const label = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginBottom: '0.45rem',
  color: 'rgba(255,255,255,0.8)',
};

const req = { color: '#f87171' };

const input = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  padding: '0.625rem 0.875rem',
  fontSize: '0.9rem',
  color: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const radioGroup = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.625rem',
};

const radioLabel = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.9rem',
  color: 'rgba(255,255,255,0.75)',
  cursor: 'pointer',
  padding: '0.5rem 0.75rem',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
};

const errorBox = {
  padding: '0.625rem 0.875rem',
  borderRadius: '8px',
  background: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.3)',
  color: '#fca5a5',
  fontSize: '0.875rem',
  marginBottom: '1rem',
};

const successBox = {
  textAlign: 'center',
  padding: '2.5rem 2rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '18px',
  maxWidth: '600px',
  width: '100%',
};

const submitBtn = (disabled) => ({
  width: '100%',
  padding: '0.75rem',
  borderRadius: '10px',
  background: disabled ? 'rgba(245,166,35,0.4)' : 'var(--accent-gold, #f5a623)',
  color: '#000',
  fontWeight: 700,
  fontSize: '0.95rem',
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'opacity 0.2s',
});

const secondaryBtn = {
  padding: '0.6rem 1.5rem',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: 'rgba(255,255,255,0.8)',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
};
