-- =============================================================
-- Studio Flow — Unified Schema v2
-- Run this in your Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS / DO blocks throughout.
-- =============================================================

-- ── 1. EVENTS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  thumbnail_url   TEXT,
  date            TEXT,
  location        TEXT,
  price           NUMERIC(10,2) DEFAULT 0,
  ticket_price    NUMERIC(10,2),
  is_paid_event   BOOLEAN DEFAULT false,
  is_paid         BOOLEAN DEFAULT false,
  stage_room_id   TEXT,
  live_room_id    TEXT,
  creator_id      UUID REFERENCES auth.users(id),
  created_by      UUID REFERENCES auth.users(id),
  starts_at       TIMESTAMPTZ,
  start_time      TIMESTAMPTZ,
  duration_minutes INTEGER,
  backstage_pass  BOOLEAN DEFAULT false,
  seat_limit      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- event_mode: 'live' or 'recorded' (replaces old event_type for events table)
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_mode    TEXT DEFAULT 'live';
ALTER TABLE events ADD COLUMN IF NOT EXISTS stream_key    TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS stream_url    TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS video_url     TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS status        TEXT DEFAULT 'upcoming';
ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT now();

-- Back-fill event_mode from old event_type column (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'event_type'
  ) THEN
    UPDATE events SET event_mode = event_type WHERE event_mode IS NULL AND event_type IS NOT NULL;
    UPDATE events SET event_mode = 'live'     WHERE event_mode IS NULL;
  ELSE
    UPDATE events SET event_mode = 'live'     WHERE event_mode IS NULL;
  END IF;
END $$;

-- Back-fill start_time from starts_at
UPDATE events SET start_time = starts_at  WHERE start_time IS NULL AND starts_at IS NOT NULL;
UPDATE events SET is_paid    = is_paid_event WHERE is_paid IS FALSE AND is_paid_event IS TRUE;
UPDATE events SET live_room_id = stage_room_id WHERE live_room_id IS NULL AND stage_room_id IS NOT NULL;
UPDATE events SET created_by   = creator_id    WHERE created_by   IS NULL AND creator_id   IS NOT NULL;

-- Indices
CREATE INDEX IF NOT EXISTS idx_events_status    ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_mode      ON events(event_mode);
CREATE INDEX IF NOT EXISTS idx_events_starttime ON events(start_time ASC);
CREATE INDEX IF NOT EXISTS idx_events_created   ON events(created_at DESC);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read events"      ON events;
DROP POLICY IF EXISTS "Auth insert events"      ON events;
DROP POLICY IF EXISTS "Owner update events"     ON events;
DROP POLICY IF EXISTS "Admin delete events"     ON events;
CREATE POLICY "Public read events"   ON events FOR SELECT USING (true);
CREATE POLICY "Auth insert events"   ON events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Owner update events"  ON events FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete events"  ON events FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── 2. CONTESTS TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  thumbnail_url    TEXT,
  category         TEXT DEFAULT 'general',
  entry_fee        NUMERIC(10,2) DEFAULT 0,
  prize_pool       NUMERIC(10,2) DEFAULT 0,
  winner_count     INTEGER DEFAULT 1,
  start_date       TIMESTAMPTZ,
  end_date         TIMESTAMPTZ,
  submission_start TIMESTAMPTZ,
  submission_end   TIMESTAMPTZ,
  voting_start     TIMESTAMPTZ,
  voting_end       TIMESTAMPTZ,
  status           TEXT DEFAULT 'draft',
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_contests_status   ON contests(status);
CREATE INDEX IF NOT EXISTS idx_contests_category ON contests(category);
CREATE INDEX IF NOT EXISTS idx_contests_created  ON contests(created_at DESC);

ALTER TABLE contests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read contests"  ON contests;
DROP POLICY IF EXISTS "Auth write contests"   ON contests;
CREATE POLICY "Public read contests" ON contests FOR SELECT USING (true);
CREATE POLICY "Auth write contests"  ON contests FOR ALL USING (auth.uid() IS NOT NULL);

-- ── 3. CONTEST_ENTRIES TABLE ─────────────────────────────────
CREATE TABLE IF NOT EXISTS contest_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id      UUID REFERENCES contests(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id),
  title           TEXT,
  description     TEXT,
  file_url        TEXT,
  storage_path    TEXT,
  submitter_email TEXT,
  vote_count      INTEGER DEFAULT 0,
  is_winner       BOOLEAN DEFAULT false,
  winner_rank     INTEGER,
  featured        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contest_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_contest_entries_contest  ON contest_entries(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_entries_votes    ON contest_entries(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_contest_entries_winner   ON contest_entries(is_winner);

ALTER TABLE contest_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read entries"  ON contest_entries;
DROP POLICY IF EXISTS "Auth write entries"   ON contest_entries;
CREATE POLICY "Public read entries" ON contest_entries FOR SELECT USING (true);
CREATE POLICY "Auth write entries"  ON contest_entries FOR ALL USING (auth.uid() IS NOT NULL);

-- ── 4. CONTEST_VOTES TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS contest_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id  UUID REFERENCES contests(id) ON DELETE CASCADE,
  entry_id    UUID REFERENCES contest_entries(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entry_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_contest_votes_entry ON contest_votes(entry_id);

ALTER TABLE contest_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth vote"  ON contest_votes;
CREATE POLICY "Auth vote" ON contest_votes FOR ALL USING (auth.uid() IS NOT NULL);

-- ── 5. ANNOUNCEMENTS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  pinned      BOOLEAN DEFAULT false,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned  ON announcements(pinned DESC);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read announcements"  ON announcements;
DROP POLICY IF EXISTS "Admin insert announcements" ON announcements;
DROP POLICY IF EXISTS "Admin update announcements" ON announcements;
DROP POLICY IF EXISTS "Admin delete announcements" ON announcements;
CREATE POLICY "Public read announcements"  ON announcements FOR SELECT USING (true);
CREATE POLICY "Admin insert announcements" ON announcements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin update announcements" ON announcements FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete announcements" ON announcements FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── 6. SUBMISSIONS TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id),
  user_name  TEXT,
  user_email TEXT,
  media_url  TEXT,
  description TEXT,
  status     TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS contest_id  UUID REFERENCES contests(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS event_id    UUID REFERENCES events(id)   ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS video_url   TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS title       TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS featured    BOOLEAN DEFAULT false;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_submissions_status  ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_user    ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth read own submissions"    ON submissions;
DROP POLICY IF EXISTS "Service full access"          ON submissions;
DROP POLICY IF EXISTS "Auth insert submissions"      ON submissions;
CREATE POLICY "Auth read own submissions" ON submissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert submissions"   ON submissions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Service full access"       ON submissions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 7. PROFILES TABLE (ensure role column exists) ────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'creator';
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ── 8. EVENT_SLOTS TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id    UUID,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  password      TEXT NOT NULL,
  video_id      UUID,
  video_url     TEXT,
  event_mode    TEXT DEFAULT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE event_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on event_slots"  ON event_slots;
DROP POLICY IF EXISTS "Users can read own event slots"           ON event_slots;
CREATE POLICY "Service role full access on event_slots" ON event_slots FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users can read own event slots"          ON event_slots FOR SELECT TO authenticated USING (auth.uid() = user_id);
