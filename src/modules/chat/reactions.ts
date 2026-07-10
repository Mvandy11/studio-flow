import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export interface Reaction {
  id:         string;
  message_id: string;
  user_id:    string;
  /** Matches message_reactions.reaction column */
  reaction:   string;
  created_at: string;
}

export interface ReactionGroup {
  /** The emoji/reaction string */
  reaction: string;
  count:    number;
  /** IDs of users who reacted */
  userIds:  string[];
}

/** Add a reaction. No-ops on duplicate (unique constraint). */
export async function addReaction(
  messageId: string,
  userId:    string,
  reaction:  string,
): Promise<void> {
  const { error } = await supabase
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: userId, reaction });

  if (error && error.code !== '23505') throw new Error(error.message);
}

/** Remove a specific reaction. */
export async function removeReaction(
  messageId: string,
  userId:    string,
  reaction:  string,
): Promise<void> {
  await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('reaction', reaction);
}

/**
 * Load reactions for a single message.
 *
 * Does NOT create a realtime channel — mounting one channel per message in
 * a list of 150 messages would exhaust Supabase's concurrent channel limit
 * and trigger "cannot add postgres_changes callbacks after subscribe()".
 *
 * Instead, reactions are loaded on mount and can be refreshed by calling
 * the returned `refetch` function (e.g. after the current user reacts).
 * Other users' reactions will appear on the next navigation / component mount.
 */
export function useReactions(messageId: string | null) {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const load = useCallback(async () => {
    if (!messageId) return;
    const { data } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId);
    setReactions((data ?? []) as Reaction[]);
  }, [messageId]);

  useEffect(() => {
    let mounted = true;
    if (!messageId) return;
    supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId)
      .then(({ data }) => {
        if (mounted) setReactions((data ?? []) as Reaction[]);
      });
    return () => { mounted = false; };
  }, [messageId]);

  /** Aggregate reactions into groups by reaction string. */
  const grouped: ReactionGroup[] = Object.values(
    reactions.reduce<Record<string, ReactionGroup>>((acc, r) => {
      if (!acc[r.reaction]) acc[r.reaction] = { reaction: r.reaction, count: 0, userIds: [] };
      acc[r.reaction].count++;
      acc[r.reaction].userIds.push(r.user_id);
      return acc;
    }, {}),
  );

  return { reactions, grouped, refetch: load };
}
