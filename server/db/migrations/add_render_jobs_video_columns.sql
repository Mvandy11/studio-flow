-- Add columns required by the Replicate video-callback handler.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE render_jobs
  ADD COLUMN IF NOT EXISTS video_url      TEXT,
  ADD COLUMN IF NOT EXISTS error_message  TEXT,
  ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ;

-- Ensure status column exists with a sensible default.
ALTER TABLE render_jobs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
