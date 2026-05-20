import { supabase } from '../../lib/supabase';
import { isAdminRole } from '../../lib/isAdmin';
import type { ChatMessage } from '../../lib/types';

/**
 * Send an admin announcement to a channel.
 * Announcements are also cross-posted to the 'announcements' channel.
 * Throws if the caller is not an admin.
 */
export async function sendAnnouncement(
  channelId: string,
  content:   string,
  userId:    string,
  role?:     string | null,
): Promise<ChatMessage> {
  if (!isAdminRole(role)) {
    throw new Error('Only admins can send announcements.');
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      channel_id:      channelId,
      user_id:         userId,
      content,
      is_announcement: true,
      session_id:      channelId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Cross-post to the dedicated announcements channel if not already there
  if (channelId !== 'announcements') {
    await supabase
      .from('chat_messages')
      .insert({
        channel_id:      'announcements',
        user_id:         userId,
        content,
        is_announcement: true,
        session_id:      'announcements',
      });
  }

  return data as ChatMessage;
}
