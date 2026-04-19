import { supabase } from './supabase';

// Send a chat message
export async function sendMessage({ session_id, sender_id, message }) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id,
      sender_id,
      message,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get all messages for a session
export async function getMessagesForSession(session_id) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// Subscribe to realtime chat updates
export function subscribeToChat(session_id, callback) {
  return supabase
    .channel(`chat:${session_id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${session_id}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
}
