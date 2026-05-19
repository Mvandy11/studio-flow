import { supabase } from '../../lib/supabase';
import type { ChatMessage } from '../../lib/types';

export interface SendMessageOptions {
  channelId:       string;
  senderId:        string;
  content:         string;
  parentMessageId?: string | null;
  isAnnouncement?: boolean;
}

/**
 * Fetch top-level messages for a channel (no parent).
 * Messages with parent_message_id are loaded separately via getThread().
 */
export async function getMessages(
  channelId: string,
  limit = 100,
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
      // session_id required by existing schema — use channel as session key
      session_id: channelId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ChatMessage;
}

/**
 * Subscribe to new top-level messages on a channel via Realtime.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(
  channelId: string,
  onMessage: (msg: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`msgs:${channelId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      },
      (payload) => {
        const msg = payload.new as ChatMessage;
        // Only surface to main feed if it's a top-level message
        if (!msg.parent_message_id) onMessage(msg);
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
