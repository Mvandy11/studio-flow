import { supabase } from './supabase';

/**
 * Load all existing messages for a room.
 */
export async function fetchInitialMessages(roomId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', roomId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Subscribe to new messages via postgres_changes.
 * Returns the Supabase channel (call supabase.removeChannel to clean up).
 */
export function subscribeToMessages(roomId, callback) {
  return supabase
    .channel(`stage-chat:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${roomId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

/**
 * Insert a message into chat_messages.
 */
export async function sendMessage(roomId, user, text) {
  const { error } = await supabase
    .from('chat_messages')
    .insert({ session_id: roomId, sender_id: user.id, message: text });

  if (error) throw error;
}

/**
 * Create and subscribe to a Presence channel for live viewer count.
 * Returns the channel so the caller can clean it up.
 */
export function createPresenceChannel(roomId, userId, onViewerUpdate) {
  const ch = supabase.channel(`stage-presence:${roomId}`, {
    config: { presence: { key: userId ?? 'anon' } },
  });

  ch
    .on('presence', { event: 'sync' }, () => {
      onViewerUpdate(Object.keys(ch.presenceState()).length);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ user_id: userId, joined_at: Date.now() });
      }
    });

  return ch;
}

/**
 * Subscribe to pinned-message broadcast events.
 * Returns the channel so the caller can hold a ref and call pinMessage().
 */
export function createPinnedChannel(roomId, onPin) {
  return supabase
    .channel(`stage-pinned:${roomId}`)
    .on('broadcast', { event: 'pin' }, ({ payload }) => onPin(payload.message))
    .subscribe();
}

/**
 * Broadcast a pin event through the already-subscribed pinned channel.
 */
export async function pinMessage(pinnedChannel, message) {
  await pinnedChannel.send({
    type: 'broadcast',
    event: 'pin',
    payload: { message },
  });
}

/**
 * Subscribe to emoji-reaction broadcast events.
 * Returns the channel so the caller can hold a ref and call sendReaction().
 */
export function createReactionChannel(roomId, onReaction) {
  return supabase
    .channel(`stage-reactions:${roomId}`)
    .on('broadcast', { event: 'reaction' }, ({ payload }) => onReaction(payload.emoji))
    .subscribe();
}

/**
 * Broadcast a reaction through the already-subscribed reaction channel.
 */
export async function sendReaction(reactionChannel, emoji) {
  await reactionChannel.send({
    type: 'broadcast',
    event: 'reaction',
    payload: { emoji },
  });
}
