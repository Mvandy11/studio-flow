import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export interface OnlineUser {
  userId:      string;
  displayName: string;
  avatarUrl:   string | null;
}

/**
 * Track the current user's online presence and return who else is online.
 *
 * Uses a unique channel name per user so multiple sessions don't collide.
 * All .on() listeners are registered BEFORE .subscribe() to avoid the
 * "cannot add callbacks after subscribe()" error.
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
  // Keep stable references so the effect only re-runs when userId changes
  const displayNameRef = useRef(displayName);
  const avatarUrlRef   = useRef(avatarUrl);
  displayNameRef.current = displayName;
  avatarUrlRef.current   = avatarUrl;

  useEffect(() => {
    if (!userId) return;

    // Build the channel with ALL listeners BEFORE .subscribe()
    const ch = supabase
      .channel(`presence:global:${userId}`, {
        config: { presence: { key: userId } },
      })
      .on(
        'presence',
        { event: 'sync' },
        () => {
          const state = ch.presenceState<{
            userId: string;
            displayName: string;
            avatarUrl?: string | null;
          }>();
          const users: OnlineUser[] = Object.values(state)
            .flat()
            .filter((p) => p.userId && p.userId !== userId)
            .map((p) => ({
              userId:      p.userId,
              displayName: p.displayName ?? 'User',
              avatarUrl:   p.avatarUrl ?? null,
            }));
          setOnlineUsers(users);
        },
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({
            userId,
            displayName: displayNameRef.current ?? 'User',
            avatarUrl:   avatarUrlRef.current ?? null,
          });
        }
      });

    return () => { supabase.removeChannel(ch); };
  }, [userId]); // Only re-run when userId changes; display/avatar update via refs

  function isUserOnline(uid: string): boolean {
    return onlineUsers.some((u) => u.userId === uid);
  }

  return { onlineUsers, isUserOnline };
}
