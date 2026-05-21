-- Create comments table for session/video comments
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS)

CREATE TABLE IF NOT EXISTS comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id    TEXT        NOT NULL,   -- session id or event id
  content     TEXT        NOT NULL CHECK (char_length(content) <= 2000),
  user_name   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_video_id   ON comments (video_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id    ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments (created_at);

-- ── Row Level Security ─────────────────────────────────────────
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read comments"   ON comments;
DROP POLICY IF EXISTS "Auth insert comments"   ON comments;
DROP POLICY IF EXISTS "Auth delete comments"   ON comments;
DROP POLICY IF EXISTS "Service full comments"  ON comments;

-- Anyone can read comments
CREATE POLICY "Public read comments"
  ON comments FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can insert their own comments
CREATE POLICY "Auth insert comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Auth delete comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role has full access (used by backend API via supabaseAdmin)
CREATE POLICY "Service full comments"
  ON comments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
