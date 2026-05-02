-- ── Contest System Tables ─────────────────────────────────────
-- Run once in your Supabase SQL Editor.

-- 1. Contests
CREATE TABLE IF NOT EXISTS contests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  thumbnail_url    TEXT,
  entry_fee        NUMERIC(10,2) DEFAULT 0,
  prize_pool       NUMERIC(10,2) DEFAULT 0,
  winner_count     INTEGER DEFAULT 1 CHECK (winner_count IN (1, 2, 3)),
  start_date       TIMESTAMPTZ,
  end_date         TIMESTAMPTZ,
  submission_start TIMESTAMPTZ,
  submission_end   TIMESTAMPTZ,
  voting_start     TIMESTAMPTZ,
  voting_end       TIMESTAMPTZ,
  status           TEXT DEFAULT 'draft'
                   CHECK (status IN ('draft','active','voting','completed','archived')),
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contests_status ON contests(status, created_at DESC);

-- 2. Contest Entries
CREATE TABLE IF NOT EXISTS contest_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id     UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  title          TEXT NOT NULL,
  description    TEXT,
  file_url       TEXT,
  storage_path   TEXT,
  submitter_name TEXT,
  submitter_email TEXT,
  vote_count     INTEGER DEFAULT 0,
  is_winner      BOOLEAN DEFAULT false,
  winner_rank    INTEGER,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contest_id, user_id)     -- one entry per user per contest
);

CREATE INDEX IF NOT EXISTS idx_contest_entries_contest
  ON contest_entries(contest_id, vote_count DESC);

-- 3. Contest Votes (one per user per entry, anti-spam)
CREATE TABLE IF NOT EXISTS contest_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  entry_id   UUID NOT NULL REFERENCES contest_entries(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entry_id, user_id)       -- one vote per user per entry
);

-- 4. Free Ticket Ledger (tracks auto-issued free viewing tickets)
CREATE TABLE IF NOT EXISTS free_tickets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL,
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  ticket_type    TEXT DEFAULT 'view_only',   -- 'view_only'
  redeemed       BOOLEAN DEFAULT false,
  source_ticket_id UUID,                     -- the paid ticket that triggered this
  issued_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- RLS (adjust to match your auth setup)
ALTER TABLE contests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_votes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_tickets   ENABLE ROW LEVEL SECURITY;
