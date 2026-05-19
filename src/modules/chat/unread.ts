import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { ChatMessage } from '../../lib/types';

/** Update the last-read timestamp for a user on a channel. */
export async function markChannelRead(
  userId:    string,
  channelId: string,
): Promise<void> {
  await supabase
    .from('chat_read_state')
    .upsert(
      { user_id: userId, channel_id: channelId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,channel_id' },
    );
}

/**
 * Hook: returns the count of unread messages per channel.
 * Reads `chat_read_state` to find the last-read timestamp, then counts
 * messages newer than that timestamp.
 *
 * @param channelIds  - channels to track
 * @param userId      - current user id
 */
export function useUnreadCounts(channelIds: string[], userId: string | undefined) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    if (!userId || channelIds.length === 0) return;

    // Fetch last-read timestamps
    const { data: readStates } = await supabase
      .from('chat_read_state')
      .select('channel_id, last_read_at')
      .eq('user_id', userId)
      .in('channel_id', channelIds);

    const readMap: Record<string, string> = {};
    for (const rs of readStates ?? []) {
      readMap[rs.channel_id] = rs.last_read_at;
    }

    // For each channel, count messages newer than last_read_at
    const newCounts: Record<string, number> = {};
    await Promise.all(
      channelIds.map(async (cid) => {
        const lastRead = readMap[cid];
        if (!lastRead) {
          // Never read — count all messages
          const { count } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('channel_id', cid)
            .is('parent_message_id', null);
          newCounts[cid] = count ?? 0;
        } else {
          const { count } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('channel_id', cid)
            .is('parent_message_id', null)
            .gt('created_at', lastRead);
          newCounts[cid] = count ?? 0;
        }
      }),
    );

    setCounts(newCounts);
  }, [channelIds.join(','), userId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { counts, refresh };
}
