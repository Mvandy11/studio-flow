import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isCreatorAdmin } from '../lib/roles';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api.js';
import { formatDistanceToNow } from 'date-fns';

export default function AdminEventRequests() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // Slot creation modal state
  const [approving,   setApproving]   = useState(null); // request being approved
  const [slotTitle,   setSlotTitle]   = useState('');
  const [slotPassword, setSlotPassword] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isCreatorAdmin(role)) { navigate('/'); return; }
    load();
  }, [authLoading, role]);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('custom_event_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    setRequests(data || []);
    setLoading(false);
  }

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async function handleApprove() {
    if (!slotTitle.trim() || !slotPassword.trim()) {
      setSaveError('Title and password are required.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const token = await getToken();
      await api('/api/custom-events/create-slot', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          request_id: approving.id,
          user_id:    approving.user_id,
          title:      slotTitle.trim(),
          password:   slotPassword.trim(),
        }),
      });

      // Mark request as approved
      await supabase
        .from('custom_event_requests')
        .update({ status: 'approved', processed_at: new Date().toISOString() })
        .eq('id', approving.id);

      setApproving(null);
      setSlotTitle('');
      setSlotPassword('');
      load();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(id) {
    if (!confirm('Reject this request?')) return;
    await supabase
      .from('custom_event_requests')
      .update({ status: 'rejected', processed_at: new Date().toISOString() })
      .eq('id', id);
    load();
  }

  function openApprove(req) {
    setApproving(req);
    setSlotTitle(req.title);
    setSlotPassword('');
    setSaveError('');
  }

  if (authLoading || loading) return (
    <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <div className="cinematic-spinner" />
    </div>
  );

  const pending  = requests.filter((r) => r.status === 'pending');
  const processed = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">🗂 Event Requests</h1>
        <p className="page-subtitle">Review and approve or reject creator custom event slot requests.</p>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      {/* ── Approve modal ── */}
      {approving && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={{ margin: '0 0 0.25rem', fontWeight: 700 }}>Approve: {approving.title}</h3>
            <p style={{ color: 'rgba(200,200,215,0.55)', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
              This will create an event slot <strong>and</strong> a draft event row. The creator will then choose "Start Live Event" or "Upload Recorded Video" from their slot page.
            </p>

            <label style={label}>Slot Title</label>
            <input
              type="text"
              value={slotTitle}
              onChange={(e) => setSlotTitle(e.target.value)}
              style={input}
            />

            <label style={{ ...label, marginTop: '0.75rem' }}>Upload Password</label>
            <input
              type="text"
              placeholder="e.g. studioflow-abc123"
              value={slotPassword}
              onChange={(e) => setSlotPassword(e.target.value)}
              style={input}
            />

            <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.875rem', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '8px', fontSize: '0.78rem', color: 'rgba(200,200,215,0.55)' }}>
              🔑 A unique stream key will be auto-generated for the creator's live events.
            </div>

            {saveError && <div style={errorBox}>{saveError}</div>}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={handleApprove} disabled={saving} style={approveBtn(saving)}>
                {saving ? 'Creating Slot…' : 'Create Slot & Approve'}
              </button>
              <button onClick={() => setApproving(null)} style={cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pending requests ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
          ⏳ Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.9rem' }}>No pending requests.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pending.map((r) => <RequestCard key={r.id} req={r} onApprove={openApprove} onReject={handleReject} />)}
          </div>
        )}
      </section>

      {/* ── Processed requests ── */}
      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
          ✅ Processed ({processed.length})
        </h2>
        {processed.length === 0 ? (
          <p style={{ color: 'rgba(200,200,215,0.4)', fontSize: '0.9rem' }}>None yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {processed.map((r) => <RequestCard key={r.id} req={r} readonly />)}
          </div>
        )}
      </section>
    </div>
  );
}

function RequestCard({ req, onApprove, onReject, readonly }) {
  const statusColor = {
    pending:  '#f5a623',
    approved: '#22c55e',
    rejected: '#f87171',
  }[req.status] || '#8b9fc5';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '14px',
      padding: '1.25rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '0.95rem' }}>{req.title}</p>
          <p style={{ margin: '0 0 0.2rem', fontSize: '0.8rem', color: 'rgba(200,200,215,0.55)' }}>
            User ID: <code style={{ fontSize: '0.75rem' }}>{req.user_id}</code>
          </p>
          <p style={{ margin: '0 0 0.2rem', fontSize: '0.8rem', color: 'rgba(200,200,215,0.55)' }}>
            Type: {req.event_type === 'locked' ? '🔒 Locked/Ticketed' : '🔓 Open with Donation'}
            {req.price != null && <> · ${req.price}</>}
          </p>
          {req.description && (
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'rgba(200,200,215,0.5)', fontStyle: 'italic' }}>
              "{req.description}"
            </p>
          )}
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'rgba(200,200,215,0.35)' }}>
            Submitted {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <span style={{
            padding: '0.2rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: `${statusColor}18`,
            color: statusColor,
            border: `1px solid ${statusColor}44`,
            textTransform: 'uppercase',
          }}>
            {req.status}
          </span>

          {!readonly && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => onApprove(req)} style={approveBtn(false)}>Approve</button>
              <button onClick={() => onReject(req.id)} style={rejectBtn}>Reject</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Styles ── */
const errorBox = {
  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
  borderRadius: '8px', padding: '0.6rem 0.875rem',
  color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1rem',
};

const label = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600,
  marginBottom: '0.35rem', color: 'rgba(255,255,255,0.75)',
};

const input = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
  padding: '0.55rem 0.75rem', fontSize: '0.875rem', color: '#fff',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

const approveBtn = (disabled) => ({
  padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.82rem',
  fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', border: 'none',
  background: disabled ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.2)',
  color: '#22c55e',
});

const rejectBtn = {
  padding: '0.45rem 0.875rem', borderRadius: '8px', fontSize: '0.82rem',
  fontWeight: 700, cursor: 'pointer', border: 'none',
  background: 'rgba(239,68,68,0.15)', color: '#f87171',
};

const cancelBtn = {
  padding: '0.45rem 0.875rem', borderRadius: '8px', fontSize: '0.82rem',
  fontWeight: 600, cursor: 'pointer',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)',
};

const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '1rem',
};

const modalCard = {
  background: '#111d33', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '18px', padding: '2rem', maxWidth: '440px', width: '100%',
};
