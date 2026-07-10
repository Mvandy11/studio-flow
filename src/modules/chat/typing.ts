import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

const TYPING_TIMEOUT_MS = 3000;

/**
 * Hook that broadcasts and receives typing indicators for a channel.
 *
 * Keeps a stable channel ref so `notifyTyping` can be called outside the
 * useEffect without creating duplicate channels.
 *
 * Usage:
 *   const { typingUsers, notifyTyping } = useTypingIndicator(channelId, userId);
 *   // call notifyTyping() on every keystroke
 */
export function useTypingIndicator(channelId: string, userId: string | undefined) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const chRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!channelId) return;

    // Build the channel with ALL listeners registered BEFORE subscribe()
    const ch = supabase
      .channel(`typing:${channelId}`, {
        config: { presence: { key: userId ?? 'anon' } },
      })
      .on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState<{ typing?: boolean }>();
        const active = Object.entries(state)
          .filter(([key, presences]) => {
            if (key === (userId ?? 'anon')) return false;
            return (presences as { typing?: boolean }[]).some((p) => p.typing);
          })
          .map(([key]) => key);
        setTypingUsers(active);
      })
      .subscribe();

    chRef.current = ch;

    return () => {
      chRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(ch);
    };
  }, [channelId, userId]);

  const notifyTyping = useCallback(() => {
    if (!chRef.current || !userId) return;
    chRef.current.track({ typing: true, user_id: userId });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      chRef.current?.track({ typing: false, user_id: userId });
    }, TYPING_TIMEOUT_MS);
  }, [userId]);

  return { typingUsers, notifyTyping };
}
