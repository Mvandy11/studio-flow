import { supabase } from '../../lib/supabase';
import type { ChatMessage } from '../../lib/types';

/**
 * Load chat history for a session, oldest-first.
 */
export async function getMessages(
  sessionId: string,
  limit = 100,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as ChatMessage[];
}
