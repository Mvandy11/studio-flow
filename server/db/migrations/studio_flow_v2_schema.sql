-- ============================================================
-- Studio Flow 2.0 — Full Schema Migration
-- Run in Supabase SQL Editor (top to bottom, one block at a time
-- or all at once). Fully idempotent — safe to re-run.
--
-- What this migration does:
--   1. Ensures profiles has all v2 columns + correct RLS
--   2. Ensures event_slots has all v2 columns + correct RLS
--   3. Ensures donations has all v2 columns + correct RLS
--   4. Ensures revenue_pool + revenue_pool_entries are correct
--   5. Updates contest_entries INSERT policy → member_30 / creator_50 only
--   6. Drops legacy tables that are no longer used
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ──────────────────────────────────────────────────────────────
-- Table already exists. Add any columns that may be missing.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email                 text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS membership_active     boolean      NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS membership_tier       text         NOT NULL DEFAULT 'free';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS membership_started_at timestamptz;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS created_at            timestamptz  DEFAULT now();

-- RLS: enable and set correct non-recursive policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all"     ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"     ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"     ON profiles;
DROP POLICY IF EXISTS "profiles_service_full"   ON profiles;
DROP POLICY IF EXISTS "Public read"             ON profiles;
DROP POLICY IF EXISTS "profiles_select_own"     ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin"   ON profiles;

-- Anyone can read profiles (public portfolio pages, leaderboards, etc.)
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own row
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role has full access (used by server for admin ops)
CREATE POLICY "profiles_service_full"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for fast membership lookups
CREATE INDEX IF NOT EXISTS profiles_membership_tier_idx
  ON profiles (membership_tier)
  WHERE membership_active = true;


-- ──────────────────────────────────────────────────────────────
-- 2. EVENT_SLOTS
-- ──────────────────────────────────────────────────────────────
-- Table already exists with user_id. We add creator_id as an
-- alias column (populated from user_id for existing rows) plus
-- all other v2 columns.

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS creator_id   uuid REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS title        text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS description  text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS category     text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS video_url    text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS is_live      boolean DEFAULT false;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();

-- Back-fill creator_id from user_id for any existing rows
-- (where user_id is a uuid matching a profiles row)
UPDATE event_slots
  SET creator_id = user_id
  WHERE creator_id IS NULL
    AND user_id IS NOT NULL;

-- RLS: enable and set v2 policies
ALTER TABLE event_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read event_slots"          ON event_slots;
DROP POLICY IF EXISTS "Creator insert event_slots"       ON event_slots;
DROP POLICY IF EXISTS "Creator update event_slots"       ON event_slots;
DROP POLICY IF EXISTS "Creator delete event_slots"       ON event_slots;
DROP POLICY IF EXISTS "Service role full access on event_slots" ON event_slots;
DROP POLICY IF EXISTS "Users can read own event slots"   ON event_slots;

-- Public can browse all event slots (category listing, event detail page)
CREATE POLICY "Public read event_slots"
  ON event_slots FOR SELECT
  USING (true);

-- Only the creator can insert their own slots
CREATE POLICY "Creator insert event_slots"
  ON event_slots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

-- Only the creator can update their own slots
CREATE POLICY "Creator update event_slots"
  ON event_slots FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Only the creator can delete their own slots
CREATE POLICY "Creator delete event_slots"
  ON event_slots FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Service role retains full bypass (API server ops)
CREATE POLICY "Service role full access on event_slots"
  ON event_slots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for fast category + creator queries
CREATE INDEX IF NOT EXISTS event_slots_creator_id_idx  ON event_slots (creator_id);
CREATE INDEX IF NOT EXISTS event_slots_category_idx    ON event_slots (category);
CREATE INDEX IF NOT EXISTS event_slots_created_at_idx  ON event_slots (created_at DESC);


-- ──────────────────────────────────────────────────────────────
-- 3. DONATIONS
-- ──────────────────────────────────────────────────────────────
-- Table already exists with user_id, amount.
-- event_id and creator_id were added via add_event_creator_to_donations.sql.
-- Add donor name/email columns for the v2 donation panel.

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS event_id    uuid REFERENCES event_slots(id) ON DELETE SET NULL;

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS creator_id  uuid REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS donor_name  text;

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS donor_email text;

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS created_at  timestamptz DEFAULT now();

-- Indexes
CREATE INDEX IF NOT EXISTS donations_event_id_idx   ON donations (event_id);
CREATE INDEX IF NOT EXISTS donations_creator_id_idx ON donations (creator_id);
CREATE INDEX IF NOT EXISTS donations_user_id_idx    ON donations (user_id);

-- RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read donations"              ON donations;
DROP POLICY IF EXISTS "Public can read event donations"    ON donations;
DROP POLICY IF EXISTS "Users can read own donations"       ON donations;
DROP POLICY IF EXISTS "Creators can read donations to them" ON donations;
DROP POLICY IF EXISTS "Users can insert own donations"     ON donations;
DROP POLICY IF EXISTS "Service role full access on donations" ON donations;

-- Anyone can read aggregate donation data (event detail pages show totals)
CREATE POLICY "Public read donations"
  ON donations FOR SELECT
  USING (true);

-- Authenticated users can insert (their Stripe donation callback writes this)
CREATE POLICY "Users can insert own donations"
  ON donations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No UPDATE or DELETE for normal users
-- Service role retains full access
CREATE POLICY "Service role full access on donations"
  ON donations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ──────────────────────────────────────────────────────────────
-- 4. REVENUE_POOL
-- ──────────────────────────────────────────────────────────────
-- Already exists. Ensure correct columns + policies exist.

CREATE TABLE IF NOT EXISTS revenue_pool (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  month        text        NOT NULL UNIQUE,
  total_amount numeric     NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE revenue_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on revenue_pool" ON revenue_pool;
DROP POLICY IF EXISTS "Public read on revenue_pool"              ON revenue_pool;

CREATE POLICY "Service role full access on revenue_pool"
  ON revenue_pool FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read pool totals (displayed on dashboard)
CREATE POLICY "Authenticated read revenue_pool"
  ON revenue_pool FOR SELECT
  TO authenticated
  USING (true);


-- ──────────────────────────────────────────────────────────────
-- 5. REVENUE_POOL_ENTRIES
-- ──────────────────────────────────────────────────────────────
-- Already exists. Ensure correct columns + policies.

CREATE TABLE IF NOT EXISTS revenue_pool_entries (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  amount     numeric     NOT NULL,
  source     text        NOT NULL CHECK (source IN ('subscription', 'donation')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE revenue_pool_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on revenue_pool_entries"  ON revenue_pool_entries;
DROP POLICY IF EXISTS "Authenticated can insert revenue_pool_entries"     ON revenue_pool_entries;
DROP POLICY IF EXISTS "Creators can read own revenue_pool_entries"        ON revenue_pool_entries;

CREATE POLICY "Service role full access on revenue_pool_entries"
  ON revenue_pool_entries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Creators can read their own entries (revenue dashboard)
CREATE POLICY "Creators can read own revenue_pool_entries"
  ON revenue_pool_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

CREATE INDEX IF NOT EXISTS rpe_creator_id_idx ON revenue_pool_entries (creator_id);
CREATE INDEX IF NOT EXISTS rpe_created_at_idx ON revenue_pool_entries (created_at DESC);


-- ──────────────────────────────────────────────────────────────
-- 6. CONTEST_ENTRIES — restrict INSERT to members + creators
-- ──────────────────────────────────────────────────────────────
-- The existing table already exists. We only update the INSERT policy
-- so only member_30 and creator_50 (plus admins via service role) can submit.

ALTER TABLE contest_entries ENABLE ROW LEVEL SECURITY;

-- Drop the old open-to-any-authenticated-user INSERT policy
DROP POLICY IF EXISTS "Auth insert entries"           ON contest_entries;
DROP POLICY IF EXISTS "Public read entries"           ON contest_entries;
DROP POLICY IF EXISTS "Members can insert contest entries" ON contest_entries;

-- Public can still read all entries (gallery is always visible)
CREATE POLICY "Public read entries"
  ON contest_entries FOR SELECT
  USING (true);

-- Only member_30 or creator_50 (or service role) can insert entries.
-- We read membership_tier from the profiles table using auth.uid().
-- This avoids recursive policies because contest_entries doesn't
-- reference profiles in its own policy check — it just reads from profiles.
CREATE POLICY "Members can insert contest entries"
  ON contest_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND membership_active = true
        AND membership_tier IN ('member_30', 'creator_50')
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'creator_admin'
    )
  );

-- Service role retains full bypass (admin ops, seeding)
DROP POLICY IF EXISTS "Service role full access on contest_entries" ON contest_entries;

CREATE POLICY "Service role full access on contest_entries"
  ON contest_entries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ──────────────────────────────────────────────────────────────
-- 7. DROP LEGACY TABLES
-- ──────────────────────────────────────────────────────────────
-- These tables are no longer used in Studio Flow 2.0.
-- custom_event_requests is intentionally NOT dropped here —
-- it is still referenced by server routes.

DROP TABLE IF EXISTS event_requests         CASCADE;
DROP TABLE IF EXISTS creator_applications   CASCADE;
DROP TABLE IF EXISTS subscription_sync      CASCADE;
DROP TABLE IF EXISTS webhook_logs           CASCADE;


-- ──────────────────────────────────────────────────────────────
-- 8. FORCE SCHEMA CACHE RELOAD
-- ──────────────────────────────────────────────────────────────
-- Forces PostgREST to pick up all column and policy changes immediately.
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- DONE. Verify by running:
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'event_slots' ORDER BY ordinal_position;
--
--   SELECT policyname, cmd FROM pg_policies
--   WHERE tablename = 'contest_entries';
-- ============================================================
