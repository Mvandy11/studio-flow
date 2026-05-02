-- ── Studio Flow Hub Tables ──────────────────────────────────
-- Run in your Supabase SQL editor.

-- Membership flag on profiles (if profiles table exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_member BOOLEAN DEFAULT false;

-- Hub contest submissions (separate from contest_entries for the named contests)
CREATE TABLE IF NOT EXISTS hub_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id   TEXT NOT NULL,   -- e.g. 'contest-funny', 'contest-hoops'
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
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  event_id     TEXT NOT NULL,
  event_title  TEXT NOT NULL,
  ticket_type  TEXT DEFAULT 'paid' CHECK (ticket_type IN ('paid', 'free')),
  amount       NUMERIC(10,2) DEFAULT 0,
  status       TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'used', 'expired')),
  purchased_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_tickets_user ON hub_tickets(user_id, purchased_at DESC);

-- RLS
ALTER TABLE hub_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_votes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_tickets     ENABLE ROW LEVEL SECURITY;
