import React from 'react';
import { useRenderJobStatus } from '../hooks/useRenderJobStatus';

/**
 * RenderJobPlayer
 *
 * Shows a spinner while the avatar video is being generated,
 * plays the video when ready, and shows an error if it fails.
 *
 * @param {{ render_job_id: string }} props
 */
export default function RenderJobPlayer({ render_job_id }) {
  const { status, video_url, error_message, loading } = useRenderJobStatus(render_job_id);

  if (!render_job_id) return null;

  if (loading) {
    return (
      <div className="render-job-player render-job-player--loading">
        <div className="render-job-player__spinner" aria-hidden="true" />
        <p className="render-job-player__label">Loading…</p>
      </div>
    );
  }

  if (status === 'completed' && video_url) {
    return (
      <div className="render-job-player render-job-player--done">
        <video
          className="render-job-player__video"
          src={video_url}
          autoPlay
          controls
          playsInline
        />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="render-job-player render-job-player--error">
        <p className="render-job-player__error">
          ❌ Video generation failed{error_message ? `: ${error_message}` : '.'}
        </p>
      </div>
    );
  }

  // pending | processing | any other in-progress state
  return (
    <div className="render-job-player render-job-player--loading">
      <div className="render-job-player__spinner" aria-hidden="true" />
      <p className="render-job-player__label">Generating your avatar video…</p>
    </div>
  );
}
