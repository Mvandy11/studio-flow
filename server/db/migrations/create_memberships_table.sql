-- ── Memberships Table ────────────────────────────────────────
-- Run once in your Supabase SQL Editor.
-- Tracks user membership tier, status, and Stripe linkage.

CREATE TABLE IF NOT EXISTS memberships (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                   TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'monthly', 'enterprise')),
  is_active              BOOLEAN DEFAULT false,
  started_at             TIMESTAMPTZ,
  expires_at             TIMESTAMPTZ,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user   ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_active ON memberships(is_active);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner memberships"   ON memberships;
DROP POLICY IF EXISTS "Service memberships" ON memberships;

CREATE POLICY "Owner memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service memberships"
  ON memberships FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
