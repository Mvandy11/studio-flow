import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export interface OnlineUser {
  userId:      string;
  displayName: string;
  avatarUrl:   string | null;
}

/**
 * Track the current user's online presence and return who else is online.
 *
 * Usage:
 *   const { onlineUsers, isUserOnline } = useOnlinePresence(userId, displayName);
 */
export function useOnlinePresence(
  userId:      string | undefined,
  displayName: string | undefined,
  avatarUrl?:  string | null,
) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!userId) return;

    const ch = supabase.channel('presence:global', {
      config: { presence: { key: userId } },
    });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ userId: string; displayName: string; avatarUrl?: string | null }>();
      const users: OnlineUser[] = Object.values(state)
        .flat()
        .filter((p) => p.userId && p.userId !== userId)
        .map((p) => ({
          userId:      p.userId,
          displayName: p.displayName ?? 'User',
          avatarUrl:   p.avatarUrl ?? null,
        }));
      setOnlineUsers(users);
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ userId, displayName: displayName ?? 'User', avatarUrl: avatarUrl ?? null });
      }
    });

    return () => { supabase.removeChannel(ch); };
  }, [userId, displayName, avatarUrl]);

  function isUserOnline(uid: string): boolean {
    return onlineUsers.some((u) => u.userId === uid);
  }

  return { onlineUsers, isUserOnline };
}
