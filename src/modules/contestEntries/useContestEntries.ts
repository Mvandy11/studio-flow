import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ContestEntry } from '../../lib/types';
import { getContestEntries } from './getContestEntries';

/**
 * Hook: load and live-update contest entries for a single contest.
 *
 * Subscribes to INSERT and UPDATE events on contest_entries so vote
 * counts and new submissions reflect in real time without a page reload.
 *
 * Requires Realtime enabled on `contest_entries` in
 * Supabase Dashboard → Database → Replication.
 */
export function useContestEntries(contestId: string | null) {
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!contestId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    // ── Initial load ────────────────────────────────────────────────
    getContestEntries(contestId)
      .then((data) => { if (active) setEntries(data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });

    // ── Realtime: new entry submitted ────────────────────────────────
    const ch = supabase
      .channel(`contest-entries:${contestId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'contest_entries',
          filter: `contest_id=eq.${contestId}`,
        },
        (payload) => {
          setEntries((prev) => {
            if (prev.some((e) => e.id === payload.new.id)) return prev;
            return [payload.new as ContestEntry, ...prev];
          });
        },
      )
      // vote_count update triggers an UPDATE event
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'contest_entries',
          filter: `contest_id=eq.${contestId}`,
        },
        (payload) => {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === payload.new.id ? (payload.new as ContestEntry) : e,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [contestId]);

  return { entries, loading, error };
}
