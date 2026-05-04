-- ── Studio Flow Hub Tables ──────────────────────────────────
-- Run in your Supabase SQL editor.
-- Re-running is safe (all statements use IF NOT EXISTS / IF NOT EXISTS guards).

-- Membership flag on profiles (if profiles table exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_member BOOLEAN DEFAULT false;

-- Hub contest submissions
CREATE TABLE IF NOT EXISTS hub_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id   TEXT NOT NULL,   -- monthly ID, e.g. 'best-photo-2026-05'
  user_id      UUID REFERENCES auth.users(id),
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  content_url  TEXT,
  description  TEXT,
  vote_count   INTEGER DEFAULT 0,
  is_winner    BOOLEAN DEFAULT false,
  winner_rank  INTEGER,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_submissions_contest
  ON hub_submissions(contest_id, vote_count DESC);

-- Hub votes (one vote per user per submission)
CREATE TABLE IF NOT EXISTS hub_votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES hub_submissions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(submission_id, user_id)
);

-- Hub tickets (paid + free viewing)
CREATE TABLE IF NOT EXISTS hub_tickets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  event_id       TEXT NOT NULL,
  event_title    TEXT NOT NULL,
  ticket_type    TEXT DEFAULT 'paid'
                   CHECK (ticket_type IN ('paid', 'free', 'contest')),
  amount         NUMERIC(10,2) DEFAULT 0,
  voting_allowed BOOLEAN DEFAULT false,
  status         TEXT DEFAULT 'upcoming'
                   CHECK (status IN ('upcoming', 'used', 'expired')),
  purchased_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_tickets_user   ON hub_tickets(user_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_hub_tickets_event  ON hub_tickets(event_id, ticket_type);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE hub_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_votes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_tickets     ENABLE ROW LEVEL SECURITY;

-- Submissions: public read, auth insert
CREATE POLICY IF NOT EXISTS "hub_submissions_read"
  ON hub_submissions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "hub_submissions_insert"
  ON hub_submissions FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Votes: owner read+insert
CREATE POLICY IF NOT EXISTS "hub_votes_read"
  ON hub_votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "hub_votes_insert"
  ON hub_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tickets: owner read+insert
CREATE POLICY IF NOT EXISTS "hub_tickets_read"
  ON hub_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "hub_tickets_insert"
  ON hub_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Add voting_allowed column to existing installs ──────────
ALTER TABLE hub_tickets ADD COLUMN IF NOT EXISTS voting_allowed BOOLEAN DEFAULT false;

-- ── Update existing ticket_type CHECK constraint ────────────
-- Supabase/Postgres: drop old constraint, re-add with new values
DO $$
BEGIN
  ALTER TABLE hub_tickets DROP CONSTRAINT IF EXISTS hub_tickets_ticket_type_check;
  ALTER TABLE hub_tickets
    ADD CONSTRAINT hub_tickets_ticket_type_check
    CHECK (ticket_type IN ('paid', 'free', 'contest'));
EXCEPTION WHEN others THEN NULL;
END $$;
