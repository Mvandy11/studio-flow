import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Realtime chat hook for studio session rooms.
 * Filters by session_id (the room UUID) so stage / session pages
 * get their own isolated chat stream.
 */
export function useRealtimeChat(sessionId, userId) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!sessionId) return;

    // ── Initial load ─────────────────────────────────────────────
    supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data ?? []));

    // ── Realtime subscription ─────────────────────────────────────
    const ch = supabase
      .channel(`session-chat:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event:  'DELETE',
          schema: 'public',
          table:  'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [sessionId]);

  /** Send a message to this session's chat room. */
  async function send(text) {
    if (!text?.trim() || !userId) return;
    await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        channel_id: sessionId,   // keep schema consistent
        sender_id:  userId,
        message:    text.trim(),
      });
  }

  return { messages, send };
}
