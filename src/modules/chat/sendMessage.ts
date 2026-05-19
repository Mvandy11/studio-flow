import { supabase } from '../../lib/supabase';
import type { ChatMessage } from '../../lib/types';

/**
 * Send a message to a session's chat room.
 * Authenticated users only (Supabase RLS enforced).
 */
export async function sendMessage(
  sessionId: string,
  senderId: string,
  message: string,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, sender_id: senderId, message })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ChatMessage;
}
