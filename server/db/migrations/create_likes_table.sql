-- Run in Supabase SQL Editor.
-- Creates the likes table for contest entry likes (replaces old vote system).

CREATE TABLE IF NOT EXISTS likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id   UUID NOT NULL REFERENCES contest_entries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_entry   ON likes(entry_id);
CREATE INDEX IF NOT EXISTS idx_likes_user    ON likes(user_id);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read likes"   ON likes;
DROP POLICY IF EXISTS "Auth insert likes"   ON likes;
DROP POLICY IF EXISTS "Owner delete likes"  ON likes;

CREATE POLICY "Public read likes"
  ON likes FOR SELECT USING (true);

CREATE POLICY "Auth insert likes"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner delete likes"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);
