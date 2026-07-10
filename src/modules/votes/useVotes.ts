import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ContestVote } from '../../lib/types';
import { getVotes, hasUserVoted } from './getVotes';

/**
 * Hook: load and live-update votes for a contest.
 *
 * Provides:
 *   - `votes`       — all votes for this contest
 *   - `votedIds`    — Set of entry IDs the current user has voted on
 *   - `countByEntry`— Map<entryId, voteCount>
 *
 * Subscribes to INSERT events on contest_votes so vote totals update
 * live without a page reload.
 *
 * Requires Realtime enabled on `contest_votes` in
 * Supabase Dashboard → Database → Replication.
 */
export function useVotes(contestId: string | null, userId?: string) {
  const [votes,      setVotes]      = useState<ContestVote[]>([]);
  const [votedIds,   setVotedIds]   = useState<Set<string>>(new Set());
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!contestId) { setLoading(false); return; }

    let active = true;
    setLoading(true);

    // ── Initial load ─────────────────────────────────────────────────
    getVotes(contestId)
      .then((data) => {
        if (!active) return;
        setVotes(data);
        if (userId) {
          const mine = new Set(
            data.filter((v) => v.user_id === userId).map((v) => v.entry_id),
          );
          setVotedIds(mine);
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });

    // ── Realtime: new vote cast ──────────────────────────────────────
    const ch = supabase
      .channel(`contest-votes:${contestId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'contest_votes',
          filter: `contest_id=eq.${contestId}`,
        },
        (payload) => {
          const vote = payload.new as ContestVote;
          setVotes((prev) => {
            if (prev.some((v) => v.id === vote.id)) return prev;
            return [...prev, vote];
          });
          // If this is the current user's vote, track it locally
          if (userId && vote.user_id === userId) {
            setVotedIds((prev) => new Set([...prev, vote.entry_id]));
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [contestId, userId]);

  /** Vote count per entry, derived from votes array. */
  const countByEntry = votes.reduce<Record<string, number>>((acc, v) => {
    acc[v.entry_id] = (acc[v.entry_id] ?? 0) + 1;
    return acc;
  }, {});

  return { votes, votedIds, countByEntry, loading };
}
