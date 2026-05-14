-- ── Public RLS Policies for Studio Flow ───────────────────────
-- Fixes: anon role had no SELECT access on contests/submissions/
--        likes/comments/winners/profiles, causing empty results
--        on all public pages.
-- Safe to re-run: all policies are dropped before recreating.

-- ──────────────────────────────────────────────────────────────
-- 1. contests
-- ──────────────────────────────────────────────────────────────
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read contests"   ON contests;
DROP POLICY IF EXISTS "Service full contests"  ON contests;

CREATE POLICY "Public read contests"
  ON contests FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service full contests"
  ON contests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 2. submissions
-- ──────────────────────────────────────────────────────────────
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read submissions"   ON submissions;
DROP POLICY IF EXISTS "Auth insert submissions"   ON submissions;
DROP POLICY IF EXISTS "Auth update submissions"   ON submissions;
DROP POLICY IF EXISTS "Auth delete submissions"   ON submissions;
DROP POLICY IF EXISTS "Service full submissions"  ON submissions;

CREATE POLICY "Public read submissions"
  ON submissions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Auth insert submissions"
  ON submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Auth update submissions"
  ON submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Auth delete submissions"
  ON submissions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service full submissions"
  ON submissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 3. likes
-- ──────────────────────────────────────────────────────────────
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read likes"   ON likes;
DROP POLICY IF EXISTS "Auth insert likes"   ON likes;
DROP POLICY IF EXISTS "Auth delete likes"   ON likes;
DROP POLICY IF EXISTS "Service full likes"  ON likes;

CREATE POLICY "Public read likes"
  ON likes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Auth insert likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Auth delete likes"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service full likes"
  ON likes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 4. comments
-- ──────────────────────────────────────────────────────────────
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read comments"   ON comments;
DROP POLICY IF EXISTS "Auth insert comments"   ON comments;
DROP POLICY IF EXISTS "Auth delete comments"   ON comments;
DROP POLICY IF EXISTS "Service full comments"  ON comments;

CREATE POLICY "Public read comments"
  ON comments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Auth insert comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Auth delete comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service full comments"
  ON comments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 5. winners
-- ──────────────────────────────────────────────────────────────
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read winners"   ON winners;
DROP POLICY IF EXISTS "Service full winners"  ON winners;

CREATE POLICY "Public read winners"
  ON winners FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service full winners"
  ON winners FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 6. profiles
-- ──────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles"   ON profiles;
DROP POLICY IF EXISTS "Auth update own profile" ON profiles;
DROP POLICY IF EXISTS "Service full profiles"  ON profiles;

CREATE POLICY "Public read profiles"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Auth update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service full profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 7. Validation queries (results visible in SQL editor output)
-- ──────────────────────────────────────────────────────────────
SELECT 'contests'    AS tbl, count(*) FROM contests;
SELECT 'submissions' AS tbl, count(*) FROM submissions;
SELECT 'likes'       AS tbl, count(*) FROM likes;
SELECT 'comments'    AS tbl, count(*) FROM comments;
SELECT 'winners'     AS tbl, count(*) FROM winners;
SELECT 'profiles'    AS tbl, count(*) FROM profiles;
