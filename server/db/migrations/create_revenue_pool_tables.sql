-- Run in Supabase SQL Editor.
-- Creates the Creator Revenue Pool tables.

-- ── revenue_pool ─────────────────────────────────────────────────────────────
-- One row per calendar month; stores the summed pool total for that month.
CREATE TABLE IF NOT EXISTS revenue_pool (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  month        text        NOT NULL UNIQUE,   -- e.g. "2026-05"
  total_amount numeric     NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE revenue_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on revenue_pool"
  ON revenue_pool FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Everyone can read monthly pool totals (for dashboard display)
CREATE POLICY "Public read on revenue_pool"
  ON revenue_pool FOR SELECT TO anon, authenticated
  USING (true);

-- ── revenue_pool_entries ──────────────────────────────────────────────────────
-- Individual contribution events: creator_50 subscriptions + donations.
CREATE TABLE IF NOT EXISTS revenue_pool_entries (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  amount     numeric     NOT NULL,
  source     text        NOT NULL CHECK (source IN ('subscription', 'donation')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE revenue_pool_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on revenue_pool_entries"
  ON revenue_pool_entries FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated users can insert their own entries (donation path inserts from client)
CREATE POLICY "Authenticated can insert revenue_pool_entries"
  ON revenue_pool_entries FOR INSERT TO authenticated
  WITH CHECK (true);

-- Creators can read entries associated with them
CREATE POLICY "Creators can read own revenue_pool_entries"
  ON revenue_pool_entries FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

-- Index for fast per-creator and per-month queries
CREATE INDEX IF NOT EXISTS rpe_creator_id_idx ON revenue_pool_entries (creator_id);
CREATE INDEX IF NOT EXISTS rpe_created_at_idx ON revenue_pool_entries (created_at);
