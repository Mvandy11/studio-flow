-- Run in Supabase SQL Editor.
-- Tracks whether a user has an active $30/month Studio Flow subscription.

CREATE TABLE IF NOT EXISTS subscription_status (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active              boolean DEFAULT false,
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

ALTER TABLE subscription_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on subscription_status"
  ON subscription_status FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own subscription_status"
  ON subscription_status FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
