import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { ContestEntry } from '../../lib/types';
import { getContestEntries } from './getContestEntries';

/**
 * Hook: load and live-update contest entries for a single contest.
 *
 * Subscribes to INSERT and UPDATE events on submissions so new
 * entries reflect in real time without a page reload.
 *
 * Requires Realtime enabled on `submissions` in
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

    getContestEntries(contestId)
      .then((data) => { if (active) setEntries(data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });

    const ch = supabase
      .channel(`submissions:${contestId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'submissions',
          filter: `contest_id=eq.${contestId}`,
        },
        (payload) => {
          setEntries((prev) => {
            if (prev.some((e) => e.id === payload.new.id)) return prev;
            return [payload.new as ContestEntry, ...prev];
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'submissions',
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
