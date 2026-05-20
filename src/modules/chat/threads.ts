import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ChatMessage } from '../../lib/types';

/** Fetch all replies for a parent message, oldest-first. */
export async function getThread(parentMessageId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('parent_message_id', parentMessageId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ChatMessage[];
}

/** Send a reply to an existing message. */
export async function replyToMessage(
  parentMessageId: string,
  channelId:       string,
  userId:          string,
  content:         string,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      parent_message_id: parentMessageId,
      channel_id:        channelId,
      user_id:           userId,
      content,
      session_id:        channelId,
      is_announcement:   false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ChatMessage;
}

/** Hook: load a thread and subscribe to live replies. */
export function useThread(parentMessageId: string | null) {
  const [replies,    setReplies]    = useState<ChatMessage[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [replyCount, setReplyCount] = useState(0);

  useEffect(() => {
    if (!parentMessageId) { setReplies([]); return; }

    setLoading(true);
    getThread(parentMessageId)
      .then((msgs) => { setReplies(msgs); setReplyCount(msgs.length); })
      .finally(() => setLoading(false));

    const ch = supabase
      .channel(`thread:${parentMessageId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'chat_messages',
          filter: `parent_message_id=eq.${parentMessageId}`,
        },
        (p) => {
          setReplies((prev) => [...prev, p.new as ChatMessage]);
          setReplyCount((c) => c + 1);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [parentMessageId]);

  return { replies, loading, replyCount };
}
