import { supabase } from '../../lib/supabase';
import type { ChatMessage } from '../../lib/types';

export interface SendMessageOptions {
  channelId:        string;
  senderId:         string;
  content:          string;
  parentMessageId?: string | null;
  isAnnouncement?:  boolean;
}

export interface MessageHandlers {
  onInsert:  (msg: ChatMessage) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (msg: ChatMessage) => void;
}

/**
 * Fetch top-level messages for a channel (no parent).
 * Messages with parent_message_id are loaded separately via getThread().
 */
export async function getMessages(
  channelId: string,
  limit = 150,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('channel_id', channelId)
    .is('parent_message_id', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as ChatMessage[];
}

/** Send a message to a channel, optionally as a reply or announcement. */
export async function sendMessage(opts: SendMessageOptions): Promise<ChatMessage> {
  const { channelId, senderId, content, parentMessageId, isAnnouncement } = opts;

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      channel_id:        channelId,
      sender_id:         senderId,
      message:           content,
      parent_message_id: parentMessageId ?? null,
      is_announcement:   isAnnouncement  ?? false,
      // session_id matches channel so existing RLS / queries still work
      session_id:        channelId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ChatMessage;
}

/**
 * Subscribe to all changes (INSERT / UPDATE / DELETE) for top-level messages
 * on a channel via Supabase Realtime.
 *
 * Returns an unsubscribe function — call it on component unmount.
 *
 * Requires Realtime enabled on `chat_messages` in
 * Supabase Dashboard → Database → Replication.
 */
export function subscribeToMessages(
  channelId: string,
  handlers:  MessageHandlers,
): () => void {
  const ch = supabase
    .channel(`msgs:${channelId}`)
    // New message
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
      (payload) => {
        const msg = payload.new as ChatMessage;
        // Only surface top-level messages to the main feed
        if (!msg.parent_message_id) handlers.onInsert(msg);
      },
    )
    // Message deleted (admin or own)
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
      (payload) => {
        const id = (payload.old as { id: string }).id;
        handlers.onDelete?.(id);
      },
    )
    // Message edited (future feature)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
      (payload) => {
        handlers.onUpdate?.(payload.new as ChatMessage);
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(ch); };
}
