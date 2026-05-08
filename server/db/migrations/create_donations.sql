-- Run in Supabase SQL Editor.
-- Tracks all donations. 100% of donation amount goes to the reward pool.

CREATE TABLE IF NOT EXISTS donations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount            numeric NOT NULL,
  stripe_payment_id text,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on donations"
  ON donations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own donations"
  ON donations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
