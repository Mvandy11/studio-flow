-- ── Fix: Contests Public Visibility ───────────────────────────
-- Run once in your Supabase SQL Editor.
-- Safe to re-run: all statements use IF NOT EXISTS / DROP IF EXISTS.
--
-- What this fixes:
--   1. Adds the 'category' column to contests (was missing in original migration)
--   2. Ensures RLS allows public SELECT on contests (anon + authenticated)
--   3. Ensures service_role has full access (server bypasses RLS this way)
--   4. Seeds two sample active contests so the page isn't empty on first load
-- ──────────────────────────────────────────────────────────────

-- 1. Add missing columns to contests
ALTER TABLE contests ADD COLUMN IF NOT EXISTS category   TEXT DEFAULT 'general';
ALTER TABLE contests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Tighten RLS: public SELECT, service_role full access
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read contests"  ON contests;
DROP POLICY IF EXISTS "Auth write contests"   ON contests;
DROP POLICY IF EXISTS "Service full contests" ON contests;

CREATE POLICY "Public read contests"
  ON contests FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service full contests"
  ON contests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Seed two sample contests (only if table is empty)
DO $$
BEGIN
  IF (SELECT count(*) FROM contests) = 0 THEN
    INSERT INTO contests (title, description, prize_pool, winner_count, status, category) VALUES
    (
      'Funniest Baby Moments',
      'Submit your funniest baby moments — caught on camera! The most hilarious clip wins.',
      0, 1, 'active', 'creative'
    ),
    (
      'World''s Funniest Video',
      'Think you''ve captured the world''s funniest video? Enter now and let the votes decide!',
      0, 1, 'active', 'creative'
    );
  END IF;
END $$;

-- 4. Verify
SELECT status, category, title FROM contests ORDER BY created_at DESC LIMIT 10;
