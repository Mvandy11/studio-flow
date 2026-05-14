-- ── Drawing Pot + Payout Tables ──────────────────────────────
-- Run once in your Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS throughout.

-- ── 1. Drawing fields on events ───────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS drawing_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS drawing_amount  NUMERIC(10,2);

-- ── 2. ticket_purchases ───────────────────────────────────────
-- Tracks every ticket purchase; drawing_entry = true when drawing is enabled.
CREATE TABLE IF NOT EXISTS ticket_purchases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  drawing_entry  BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_purchases_event   ON ticket_purchases(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_drawing ON ticket_purchases(event_id, drawing_entry);

ALTER TABLE ticket_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner read purchases"   ON ticket_purchases;
DROP POLICY IF EXISTS "Auth insert purchases"  ON ticket_purchases;
DROP POLICY IF EXISTS "Service full purchases" ON ticket_purchases;

CREATE POLICY "Owner read purchases"
  ON ticket_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Auth insert purchases"
  ON ticket_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service full purchases"
  ON ticket_purchases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 3. payout_methods ─────────────────────────────────────────
-- One row per creator per method; supports multiple methods.
CREATE TABLE IF NOT EXISTS payout_methods (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method     TEXT NOT NULL CHECK (method IN ('paypal','venmo','stripe','cashapp','bank')),
  account    TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, method)
);

CREATE INDEX IF NOT EXISTS idx_payout_methods_user ON payout_methods(user_id);

ALTER TABLE payout_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner payout_methods"   ON payout_methods;
DROP POLICY IF EXISTS "Service payout_methods" ON payout_methods;

CREATE POLICY "Owner payout_methods"
  ON payout_methods FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service payout_methods"
  ON payout_methods FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 4. payout_logs ────────────────────────────────────────────
-- Tracks every initiated or completed payout.
CREATE TABLE IF NOT EXISTS payout_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id   UUID REFERENCES events(id)     ON DELETE SET NULL,
  amount     NUMERIC(10,2) NOT NULL,
  method     TEXT NOT NULL,
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_logs_user   ON payout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_logs_status ON payout_logs(status);

ALTER TABLE payout_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner read payout_logs"   ON payout_logs;
DROP POLICY IF EXISTS "Service full payout_logs" ON payout_logs;

CREATE POLICY "Owner read payout_logs"
  ON payout_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service full payout_logs"
  ON payout_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
