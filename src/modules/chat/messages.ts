import { supabase } from '../../lib/supabaseClient';
import type { ChatMessage } from '../../lib/types';

export interface SendMessageOptions {
  channelId:        string;
  userId:           string;
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
  const { channelId, userId, content, parentMessageId, isAnnouncement } = opts;

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      channel_id:        channelId,
      user_id:           userId,
      content,
      parent_message_id: parentMessageId ?? null,
      is_announcement:   isAnnouncement  ?? false,
      // session_id mirrors channel_id so existing stage/session queries still work
      session_id:        channelId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ChatMessage;
}

/**
 * Subscribe to INSERT / UPDATE / DELETE on top-level messages for a channel.
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
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
      (payload) => {
        const msg = payload.new as ChatMessage;
        if (!msg.parent_message_id) handlers.onInsert(msg);
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
      (payload) => handlers.onDelete?.((payload.old as { id: string }).id),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
      (payload) => handlers.onUpdate?.(payload.new as ChatMessage),
    )
    .subscribe();

  return () => { supabase.removeChannel(ch); };
}
