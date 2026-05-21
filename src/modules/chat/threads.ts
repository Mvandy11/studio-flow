import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
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

/**
 * Hook: load a thread and subscribe to live replies.
 *
 * Ensures ALL postgres_changes listeners are registered BEFORE subscribe()
 * is called, preventing the "cannot add callbacks after subscribe()" error.
 * Uses a mounted-guard so rapid open/close of threads doesn't leave stale
 * state updates queued.
 */
export function useThread(parentMessageId: string | null) {
  const [replies,    setReplies]    = useState<ChatMessage[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [replyCount, setReplyCount] = useState(0);

  // Stable ref to the current channel so we can clean up even if the ID
  // changes before the async initial load completes.
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!parentMessageId) {
      setReplies([]);
      setReplyCount(0);
      return;
    }

    let mounted = true;
    setLoading(true);

    // Initial load — guarded so stale async results are discarded
    getThread(parentMessageId)
      .then((msgs) => {
        if (!mounted) return;
        setReplies(msgs);
        setReplyCount(msgs.length);
      })
      .catch(() => { /* network errors are non-fatal */ })
      .finally(() => { if (mounted) setLoading(false); });

    // Subscribe: ALL .on() listeners MUST be registered before .subscribe()
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
          if (!mounted) return;
          setReplies((prev) => {
            // Deduplicate: ignore if we already have this message
            if (prev.some((r) => r.id === (p.new as ChatMessage).id)) return prev;
            return [...prev, p.new as ChatMessage];
          });
          setReplyCount((c) => c + 1);
        },
      )
      .subscribe();

    chRef.current = ch;

    return () => {
      mounted = false;
      chRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [parentMessageId]);

  return { replies, loading, replyCount };
}
