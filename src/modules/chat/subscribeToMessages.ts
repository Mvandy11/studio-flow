import { supabase } from '../../lib/supabase';
import type { ChatMessage } from '../../lib/types';

/**
 * Subscribe to new chat messages for a session via Supabase Realtime.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * Requires the chat_messages table to have Realtime enabled in
 * Supabase Dashboard → Database → Replication.
 */
export function subscribeToMessages(
  sessionId: string,
  onMessage: (msg: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`chat:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        onMessage(payload.new as ChatMessage);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
