-- Run this in your Supabase SQL Editor.
-- Adds contest_entries and contest_votes tables (safe IF NOT EXISTS)
-- and applies RLS policies so public reads and authenticated writes work.

-- ── contest_entries ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contest_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id      UUID REFERENCES contests(id) ON DELETE CASCADE,
  user_id         UUID,
  title           TEXT NOT NULL,
  description     TEXT,
  file_url        TEXT,
  storage_path    TEXT,
  submitter_email TEXT,
  vote_count      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contest_entries ENABLE ROW LEVEL SECURITY;

-- Drop before recreating to avoid "already exists" errors
DROP POLICY IF EXISTS "Public read entries"  ON contest_entries;
DROP POLICY IF EXISTS "Auth insert entries"  ON contest_entries;

CREATE POLICY "Public read entries"
  ON contest_entries FOR SELECT
  USING (true);

CREATE POLICY "Auth insert entries"
  ON contest_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── contest_votes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contest_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id  UUID REFERENCES contests(id) ON DELETE CASCADE,
  entry_id    UUID REFERENCES contest_entries(id) ON DELETE CASCADE,
  user_id     UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entry_id, user_id)
);

ALTER TABLE contest_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth insert votes" ON contest_votes;

CREATE POLICY "Auth insert votes"
  ON contest_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
