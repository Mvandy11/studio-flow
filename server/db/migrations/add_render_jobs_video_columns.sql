-- Ensure all columns required by the render-jobs pipeline exist.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE render_jobs
  ADD COLUMN IF NOT EXISTS identity_id   UUID,
  ADD COLUMN IF NOT EXISTS creator_id    UUID,
  ADD COLUMN IF NOT EXISTS script        TEXT,
  ADD COLUMN IF NOT EXISTS scenes        JSONB,
  ADD COLUMN IF NOT EXISTS status        TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS video_url     TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS completed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT now();
