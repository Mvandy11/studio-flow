import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export interface Reaction {
  id:         string;
  message_id: string;
  user_id:    string;
  emoji:      string;
  created_at: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  /** IDs of users who reacted */
  userIds: string[];
}

/** Add an emoji reaction. No-ops on duplicate (unique constraint). */
export async function addReaction(
  messageId: string,
  userId:    string,
  emoji:     string,
): Promise<void> {
  const { error } = await supabase
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji });

  if (error && error.code !== '23505') throw new Error(error.message);
}

/** Remove a specific emoji reaction. */
export async function removeReaction(
  messageId: string,
  userId:    string,
  emoji:     string,
): Promise<void> {
  await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);
}

/** Subscribe to live reactions for a single message. */
export function useReactions(messageId: string | null) {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    if (!messageId) return;

    // Initial load
    supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId)
      .then(({ data }) => setReactions((data ?? []) as Reaction[]));

    // Realtime
    const ch = supabase
      .channel(`reactions:${messageId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions', filter: `message_id=eq.${messageId}` },
        (p) => setReactions((prev) => [...prev, p.new as Reaction]),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions', filter: `message_id=eq.${messageId}` },
        (p) => setReactions((prev) => prev.filter((r) => r.id !== p.old.id)),
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [messageId]);

  /** Aggregate reactions into groups by emoji. */
  const grouped: ReactionGroup[] = Object.values(
    reactions.reduce<Record<string, ReactionGroup>>((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, userIds: [] };
      acc[r.emoji].count++;
      acc[r.emoji].userIds.push(r.user_id);
      return acc;
    }, {}),
  );

  return { reactions, grouped };
}
