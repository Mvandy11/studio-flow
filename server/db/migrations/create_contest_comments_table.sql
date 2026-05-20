-- Create contest_comments table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS contest_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id    UUID NOT NULL REFERENCES contest_entries(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name   TEXT,                     -- denormalized for display; optional
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contest_comments_entry_id ON contest_comments (entry_id);
CREATE INDEX IF NOT EXISTS idx_contest_comments_user_id  ON contest_comments (user_id);

-- Enable Row Level Security
ALTER TABLE contest_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "contest_comments_select_public"
  ON contest_comments FOR SELECT
  USING (true);

-- Authenticated users can insert their own comments
CREATE POLICY "contest_comments_insert_auth"
  ON contest_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own comments
CREATE POLICY "contest_comments_delete_own"
  ON contest_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE contest_comments;
