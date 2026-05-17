-- ============================================================
-- Migration: rls_full_audit
-- Full RLS policy audit and enforcement for all Studio Flow tables.
-- Run in Supabase SQL Editor.
-- Safe to re-run: all policies are DROPped before recreating.
-- ============================================================

-- ── IMPORTANT: profiles RLS ───────────────────────────────────
-- RLS was previously disabled (fix_profiles_rls.sql) to stop
-- infinite recursion caused by policies that queried profiles
-- from within profiles. The non-recursive re-enablement below
-- uses auth.uid() directly — NEVER a subquery on profiles.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing profiles policies to start clean
DROP POLICY IF EXISTS "profiles_select_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_select_all"   ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
DROP POLICY IF EXISTS "Public read"           ON profiles;

-- SELECT: anyone can read any profile (public portfolio pages)
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  USING (true);

-- UPDATE: users can update their own row only
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: blocked here — the trigger (handle_new_user) does inserts
-- with SECURITY DEFINER so it bypasses RLS automatically.
-- No explicit INSERT policy needed for normal users.

-- DELETE: service_role only (admins use the server-side Supabase client)
-- No policy = authenticated users cannot delete profile rows.

-- ── submissions ───────────────────────────────────────────────
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read submissions"                ON submissions;
DROP POLICY IF EXISTS "Authenticated insert submissions"       ON submissions;
DROP POLICY IF EXISTS "Subscribers can submit contest entries" ON submissions;
DROP POLICY IF EXISTS "Owner update submissions"               ON submissions;
DROP POLICY IF EXISTS "Owner delete submissions"               ON submissions;
DROP POLICY IF EXISTS "admin_bypass"                           ON submissions;

-- Public read
CREATE POLICY "Public read submissions"
  ON submissions FOR SELECT
  USING (true);

-- Subscribed users + admins can insert (user_id must match caller)
CREATE POLICY "Subscribers can submit contest entries"
  ON submissions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.subscription_active = true
          OR profiles.role IN ('admin', 'creator_admin')
        )
    )
  );

-- Owner or admin can update
CREATE POLICY "Owner update submissions"
  ON submissions FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  );

-- Owner or admin can delete
CREATE POLICY "Owner delete submissions"
  ON submissions FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  );

-- Admin full bypass (per spec: uses profiles subquery since JWT claims
-- are not set up; change to auth.jwt() ->> 'role' = 'admin' once
-- custom JWT claims are configured in Supabase dashboard)
CREATE POLICY "admin_bypass"
  ON submissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  );

-- ── contests ──────────────────────────────────────────────────
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read contests"   ON contests;
DROP POLICY IF EXISTS "Admin insert contests"  ON contests;
DROP POLICY IF EXISTS "Admin update contests"  ON contests;
DROP POLICY IF EXISTS "Admin delete contests"  ON contests;

CREATE POLICY "Public read contests"
  ON contests FOR SELECT
  USING (true);

CREATE POLICY "Admin insert contests"
  ON contests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  );

CREATE POLICY "Admin update contests"
  ON contests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  );

CREATE POLICY "Admin delete contests"
  ON contests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  );

-- ── contest_entries ───────────────────────────────────────────
ALTER TABLE contest_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read entries"           ON contest_entries;
DROP POLICY IF EXISTS "Auth insert entries"           ON contest_entries;
DROP POLICY IF EXISTS "Owner update contest entries"  ON contest_entries;
DROP POLICY IF EXISTS "Owner delete contest entries"  ON contest_entries;

CREATE POLICY "Public read entries"
  ON contest_entries FOR SELECT
  USING (true);

CREATE POLICY "Auth insert entries"
  ON contest_entries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Owner update contest entries"
  ON contest_entries FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  );

CREATE POLICY "Owner delete contest entries"
  ON contest_entries FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  );

-- ── contest_votes ─────────────────────────────────────────────
ALTER TABLE contest_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read votes"   ON contest_votes;
DROP POLICY IF EXISTS "Auth insert votes"   ON contest_votes;
DROP POLICY IF EXISTS "Owner delete votes"  ON contest_votes;

CREATE POLICY "Public read votes"
  ON contest_votes FOR SELECT
  USING (true);

CREATE POLICY "Auth insert votes"
  ON contest_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Owner delete votes"
  ON contest_votes FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  );

-- ── events ────────────────────────────────────────────────────
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read events"   ON events;
DROP POLICY IF EXISTS "Auth insert events"   ON events;
DROP POLICY IF EXISTS "Owner update events"  ON events;
DROP POLICY IF EXISTS "Admin delete events"  ON events;

CREATE POLICY "Public read events"
  ON events FOR SELECT
  USING (true);

-- Subscribers and admins can create events (server enforces this too)
CREATE POLICY "Subscriber insert events"
  ON events FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.subscription_active = true
          OR profiles.role IN ('admin', 'creator_admin')
        )
    )
  );

-- Owner or admin can update
CREATE POLICY "Owner update events"
  ON events FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  );

-- Admin only can delete
CREATE POLICY "Admin delete events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  );

-- Verify no conflicting policies remain
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN (
  'profiles', 'submissions', 'contests',
  'contest_entries', 'contest_votes', 'events'
)
ORDER BY tablename, policyname;
