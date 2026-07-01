-- ================================================================
-- Studio Flow — Full Diagnostic Repair Migration
-- Generated: 2026-06-23
-- Run this entire file in your Supabase SQL Editor.
-- Fully idempotent — safe to re-run multiple times.
--
-- Issues fixed:
--   1. sessions      — add creator_id (code uses this, table has member_id)
--   2. profiles      — add cover_url, social_links, is_live, live_stream_url, live_stream_type
--   3. events        — add live_stream_url, drawing_enabled, drawing_amount,
--                       starts_at, backstage_pass, seat_limit
--   4. event_slots   — add creator_id, description, category, thumbnail_url,
--                       video_url, is_live, updated_at + RLS
--   5. likes         — drop junk duplicate columns
--   6. comments      — drop junk duplicate columns
--   7. memberships   — make contest_id nullable (was NOT NULL, breaks non-contest memberships)
-- ================================================================


-- ──────────────────────────────────────────────────────────────
-- 1. SESSIONS — add creator_id
--    Code in Studio.jsx, CreatorProfile.jsx queries:
--      .from('sessions').eq('creator_id', user.id)
--    but table only has member_id.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Back-fill creator_id from member_id for existing rows
UPDATE sessions
SET creator_id = member_id
WHERE creator_id IS NULL AND member_id IS NOT NULL;

-- Index for fast per-creator lookups
CREATE INDEX IF NOT EXISTS idx_sessions_creator_id ON sessions(creator_id);

-- RLS: creators can read/write their own sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select_own"   ON sessions;
DROP POLICY IF EXISTS "sessions_insert_own"   ON sessions;
DROP POLICY IF EXISTS "sessions_update_own"   ON sessions;
DROP POLICY IF EXISTS "sessions_delete_own"   ON sessions;
DROP POLICY IF EXISTS "sessions_service_full" ON sessions;

CREATE POLICY "sessions_select_own"
  ON sessions FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = member_id);

CREATE POLICY "sessions_insert_own"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = member_id);

CREATE POLICY "sessions_update_own"
  ON sessions FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = member_id);

CREATE POLICY "sessions_delete_own"
  ON sessions FOR DELETE
  USING (auth.uid() = creator_id OR auth.uid() = member_id);

CREATE POLICY "sessions_service_full"
  ON sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ──────────────────────────────────────────────────────────────
-- 2. PROFILES — add missing columns
--    CreatorProfile.jsx reads/writes:
--      cover_url, social_links, is_live, live_stream_url, live_stream_type
-- ──────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cover_url         text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS social_links      jsonb        NOT NULL DEFAULT '{}';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_live           boolean      NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS live_stream_url   text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS live_stream_type  text         NOT NULL DEFAULT 'youtube';

-- Index for live creators (used to find who is currently streaming)
CREATE INDEX IF NOT EXISTS idx_profiles_is_live ON profiles(is_live) WHERE is_live = true;


-- ──────────────────────────────────────────────────────────────
-- 3. EVENTS — add missing columns
--    CreateEventPage.jsx inserts: live_stream_url, drawing_enabled,
--    drawing_amount, starts_at, backstage_pass, seat_limit
--    EventDetailsPage.jsx reads: drawing_enabled, drawing_amount,
--    live_stream_url, starts_at
-- ──────────────────────────────────────────────────────────────

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS live_stream_url   text;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS drawing_enabled   boolean      NOT NULL DEFAULT false;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS drawing_amount    numeric(10,2) DEFAULT 0;

-- starts_at is the canonical insert field in CreateEventPage;
-- start_time is the legacy column. Both should exist.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS starts_at         timestamptz;

-- Back-fill starts_at from start_time where missing
UPDATE events
SET starts_at = start_time
WHERE starts_at IS NULL AND start_time IS NOT NULL;

-- Back-fill start_time from starts_at where missing
UPDATE events
SET start_time = starts_at
WHERE start_time IS NULL AND starts_at IS NOT NULL;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS backstage_pass    boolean      NOT NULL DEFAULT false;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS seat_limit        integer;

-- Ensure visibility has a default (was NOT NULL without default in some schemas)
ALTER TABLE events
  ALTER COLUMN visibility SET DEFAULT 'public';

-- Ensure stage_room_id is nullable (not all events need a stage)
ALTER TABLE events
  ALTER COLUMN stage_room_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_drawing ON events(drawing_enabled) WHERE drawing_enabled = true;
CREATE INDEX IF NOT EXISTS idx_events_live_url ON events(live_stream_url) WHERE live_stream_url IS NOT NULL;


-- ──────────────────────────────────────────────────────────────
-- 4. EVENT_SLOTS — add v2 columns
--    The studio_flow_v2_schema.sql migration adds these but
--    the live database does not yet have them.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS creator_id    uuid REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS description   text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS category      text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS video_url     text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS is_live       boolean NOT NULL DEFAULT false;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS is_paid       boolean NOT NULL DEFAULT false;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS ticket_price  numeric(10,2);

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();

-- Back-fill creator_id from user_id
UPDATE event_slots
SET creator_id = user_id::uuid
WHERE creator_id IS NULL AND user_id IS NOT NULL;

-- Sync is_live from event_mode
UPDATE event_slots
SET is_live = true
WHERE event_mode = 'live' AND is_live = false;

CREATE INDEX IF NOT EXISTS idx_event_slots_creator ON event_slots(creator_id);
CREATE INDEX IF NOT EXISTS idx_event_slots_status  ON event_slots(status);

-- RLS
ALTER TABLE event_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_slots_select_public"  ON event_slots;
DROP POLICY IF EXISTS "event_slots_insert_own"     ON event_slots;
DROP POLICY IF EXISTS "event_slots_update_own"     ON event_slots;
DROP POLICY IF EXISTS "event_slots_service_full"   ON event_slots;

CREATE POLICY "event_slots_select_public"
  ON event_slots FOR SELECT USING (true);

CREATE POLICY "event_slots_insert_own"
  ON event_slots FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "event_slots_update_own"
  ON event_slots FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = user_id::uuid);

CREATE POLICY "event_slots_service_full"
  ON event_slots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ──────────────────────────────────────────────────────────────
-- 5. LIKES — drop junk duplicate columns
--    Live table has: submission_id, submissions_id, submissionId, submissionsId
--    Only submission_id is the correct one. The others are schema pollution.
-- ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Drop camelCase / duplicated columns if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='likes' AND column_name='submissionId') THEN
    ALTER TABLE likes DROP COLUMN "submissionId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='likes' AND column_name='submissionsId') THEN
    ALTER TABLE likes DROP COLUMN "submissionsId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='likes' AND column_name='submissions_id') THEN
    -- Back-fill submission_id before dropping
    UPDATE likes SET submission_id = submissions_id WHERE submission_id IS NULL AND submissions_id IS NOT NULL;
    ALTER TABLE likes DROP COLUMN submissions_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_likes_submission ON likes(submission_id);
CREATE INDEX IF NOT EXISTS idx_likes_user       ON likes(user_id);

-- Ensure unique constraint (no double-likes)
ALTER TABLE likes
  DROP CONSTRAINT IF EXISTS likes_submission_user_unique;
ALTER TABLE likes
  ADD CONSTRAINT likes_submission_user_unique UNIQUE (submission_id, user_id);


-- ──────────────────────────────────────────────────────────────
-- 6. COMMENTS — drop junk duplicate columns
--    Live table has: submission_id, submissionId, commentBody, comment,
--                    text, entryId, entry_id, body
--    Canonical columns: submission_id, body (or entry_id for contest entries)
-- ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Back-fill body from any existing content columns before dropping
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='commentBody') THEN
    UPDATE comments SET body = "commentBody" WHERE body IS NULL OR body = '';
    ALTER TABLE comments DROP COLUMN "commentBody";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='comment') THEN
    UPDATE comments SET body = comment WHERE body IS NULL OR body = '';
    ALTER TABLE comments DROP COLUMN comment;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='text') THEN
    UPDATE comments SET body = text WHERE body IS NULL OR body = '';
    ALTER TABLE comments DROP COLUMN text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='submissionId') THEN
    UPDATE comments SET submission_id = "submissionId" WHERE submission_id IS NULL AND "submissionId" IS NOT NULL;
    ALTER TABLE comments DROP COLUMN "submissionId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='entryId') THEN
    UPDATE comments SET entry_id = "entryId" WHERE entry_id IS NULL AND "entryId" IS NOT NULL;
    ALTER TABLE comments DROP COLUMN "entryId";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comments_submission ON comments(submission_id);
CREATE INDEX IF NOT EXISTS idx_comments_entry      ON comments(entry_id);


-- ──────────────────────────────────────────────────────────────
-- 7. MEMBERSHIPS — make contest_id nullable
--    The useMembership hook creates memberships for users without
--    any contest context. The NOT NULL constraint causes insert failures.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE memberships
  ALTER COLUMN contest_id DROP NOT NULL;


-- ──────────────────────────────────────────────────────────────
-- 8. ENSURE update_timestamp() trigger exists
--    Used by sessions and other tables to auto-update updated_at
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to sessions if not already applied
DROP TRIGGER IF EXISTS sessions_updated_at ON sessions;
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Apply to events
DROP TRIGGER IF EXISTS events_updated_at ON events;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='updated_at') THEN
    CREATE TRIGGER events_updated_at
      BEFORE UPDATE ON events
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();
  END IF;
END $$;

-- Apply to event_slots
DROP TRIGGER IF EXISTS event_slots_updated_at ON event_slots;
CREATE TRIGGER event_slots_updated_at
  BEFORE UPDATE ON event_slots
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Apply to profiles
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- ──────────────────────────────────────────────────────────────
-- 9. VERIFY — quick sanity check queries
--    Run these after the migration to confirm all columns exist.
-- ──────────────────────────────────────────────────────────────

-- Uncomment to verify:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'sessions'   ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles'   ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'events'     ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'event_slots' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'likes'      ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'comments'   ORDER BY ordinal_position;
