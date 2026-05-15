-- ── winner_history table ──────────────────────────────────────
-- Tracks every drawn/selected winner for contests and events.
-- Used by pull-winners endpoint to prevent repeat winners.
-- Safe to re-run: uses IF NOT EXISTS throughout.

CREATE TABLE IF NOT EXISTS winner_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id       UUID REFERENCES events(id)   ON DELETE SET NULL,
  contest_id     UUID REFERENCES contests(id) ON DELETE SET NULL,
  place_number   INTEGER NOT NULL DEFAULT 1,
  payout_amount  NUMERIC(10,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),

  -- Prevent the same user winning the same place in the same contest
  UNIQUE (contest_id, place_number)
);

CREATE INDEX IF NOT EXISTS idx_winner_history_contest ON winner_history(contest_id);
CREATE INDEX IF NOT EXISTS idx_winner_history_event   ON winner_history(event_id);
CREATE INDEX IF NOT EXISTS idx_winner_history_user    ON winner_history(user_id);

ALTER TABLE winner_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service full winner_history" ON winner_history;
DROP POLICY IF EXISTS "Admin read winner_history"   ON winner_history;
DROP POLICY IF EXISTS "Public read winner_history"  ON winner_history;

-- Service role (server) has full access
CREATE POLICY "Service full winner_history"
  ON winner_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read winners
CREATE POLICY "Public read winner_history"
  ON winner_history FOR SELECT
  TO authenticated
  USING (true);
