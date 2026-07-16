import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Subscribes to real-time updates for a single render job.
 *
 * @param {string|null} render_job_id
 * @returns {{ status: string|null, video_url: string|null, error_message: string|null, loading: boolean }}
 */
export function useRenderJobStatus(render_job_id) {
  const [status, setStatus]             = useState(null);
  const [video_url, setVideoUrl]        = useState(null);
  const [error_message, setErrorMsg]    = useState(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!render_job_id) {
      setLoading(false);
      return;
    }

    let channel;

    async function init() {
      // Initial fetch
      const { data, error } = await supabase
        .from('render_jobs')
        .select('status, video_url, error_message')
        .eq('id', render_job_id)
        .single();

      if (!error && data) {
        setStatus(data.status);
        setVideoUrl(data.video_url);
        setErrorMsg(data.error_message);
      }
      setLoading(false);

      // Realtime subscription
      channel = supabase
        .channel(`render_job_${render_job_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'render_jobs',
            filter: `id=eq.${render_job_id}`,
          },
          (payload) => {
            const row = payload.new;
            setStatus(row.status);
            setVideoUrl(row.video_url ?? null);
            setErrorMsg(row.error_message ?? null);
          }
        )
        .subscribe();
    }

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [render_job_id]);

  return { status, video_url, error_message, loading };
}
