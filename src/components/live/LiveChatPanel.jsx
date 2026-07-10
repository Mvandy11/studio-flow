import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * LiveChatPanel — live chat scoped to an event slot.
 *
 * Uses the live_chat_messages table (NOT free-chat or contest chat).
 * Subscribes to Supabase Realtime INSERT events for instant delivery.
 * Cleans up the channel on unmount.
 *
 * Props:
 *   slotId  {string}  — the event_slots.id
 *   user    {object|null} — current auth user (null = read-only)
 */
export default function LiveChatPanel({ slotId, user }) {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState('');
  const [loading,   setLoading]   = useState(true);

  const bottomRef = useRef(null);

  // ── Load initial messages ──────────────────────────────────────
  useEffect(() => {
    if (!slotId) return;
    setLoading(true);

    fetch(`/api/live/${slotId}/chat`)
      .then((r) => r.json())
      .then((json) => setMessages(json.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slotId]);

  // ── Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    if (!slotId) return;

    const channel = supabase
      .channel(`livechat:${slotId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'live_chat_messages',
          filter: `slot_id=eq.${slotId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Deduplicate: realtime fires for our own POST too
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [slotId]);

  // ── Auto-scroll to bottom when new messages arrive ─────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send a message ─────────────────────────────────────────────
  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    setSendError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSendError('Log in to chat.'); return; }

      const res = await fetch(`/api/live/${slotId}/chat`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: input.trim() }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send.');

      setInput('');
      // The realtime listener will add the message; no need to push manually
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  // ── Display name helper ────────────────────────────────────────
  function displayName(msg) {
    const p = msg.profiles;
    if (!p) return 'Viewer';
    return p.full_name || p.username || 'Viewer';
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '360px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '14px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.6rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        fontSize: '0.78rem', fontWeight: 700, color: 'rgba(200,200,215,0.65)',
        flexShrink: 0,
      }}>
        <span style={{ color: '#ef4444', fontSize: '0.65rem' }}>●</span>
        LIVE CHAT
      </div>

      {/* Message list */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '0.75rem 1rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
      }}>
        {loading && (
          <p style={{ color: 'rgba(200,200,215,0.3)', fontSize: '0.8rem', textAlign: 'center', margin: 'auto 0' }}>
            Loading chat…
          </p>
        )}

        {!loading && messages.length === 0 && (
          <p style={{ color: 'rgba(200,200,215,0.25)', fontSize: '0.8rem', textAlign: 'center', margin: 'auto 0' }}>
            No messages yet. Be the first!
          </p>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            {/* Avatar circle */}
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'rgba(167,139,250,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', fontWeight: 700, color: '#a78bfa',
              flexShrink: 0, marginTop: '1px',
            }}>
              {displayName(msg).charAt(0).toUpperCase()}
            </div>

            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', marginRight: '0.4rem' }}>
                {displayName(msg)}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'rgba(220,220,235,0.85)', wordBreak: 'break-word' }}>
                {msg.content}
              </span>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '0.6rem 0.75rem',
          display: 'flex', gap: '0.5rem', flexShrink: 0,
        }}
      >
        {user ? (
          <>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Say something…"
              maxLength={500}
              disabled={sending}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '0.4rem 0.65rem',
                fontSize: '0.82rem', color: '#fff', outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              style={{
                padding: '0.4rem 0.75rem', borderRadius: '8px', border: 'none',
                background: (sending || !input.trim()) ? 'rgba(167,139,250,0.15)' : 'rgba(167,139,250,0.25)',
                color: '#a78bfa', fontWeight: 700, fontSize: '0.8rem',
                cursor: (sending || !input.trim()) ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
            >
              {sending ? '…' : 'Send'}
            </button>
          </>
        ) : (
          <p style={{ fontSize: '0.78rem', color: 'rgba(200,200,215,0.3)', margin: 0, width: '100%', textAlign: 'center' }}>
            Log in to join the chat
          </p>
        )}
      </form>

      {sendError && (
        <p style={{ fontSize: '0.75rem', color: '#fca5a5', padding: '0.25rem 0.75rem 0.5rem', margin: 0 }}>
          {sendError}
        </p>
      )}
    </div>
  );
}
