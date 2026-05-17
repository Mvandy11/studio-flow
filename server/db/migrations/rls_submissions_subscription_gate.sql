-- Migration: rls_submissions_subscription_gate
-- Enforces: only authenticated users with an active subscription (or admin role)
-- may insert rows into submissions (contest entries).
-- Run in Supabase SQL editor.

-- Enable RLS if not already on
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can read submissions (public contest entries are visible to all)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'submissions' AND policyname = 'Public read submissions'
  ) THEN
    CREATE POLICY "Public read submissions" ON submissions
      FOR SELECT USING (true);
  END IF;
END $$;

-- Only drop & recreate the insert policy so we don't touch existing read policies
DROP POLICY IF EXISTS "Authenticated insert submissions" ON submissions;
DROP POLICY IF EXISTS "Subscribers can submit contest entries" ON submissions;

CREATE POLICY "Subscribers can submit contest entries" ON submissions
  FOR INSERT
  WITH CHECK (
    -- Row's user_id must match the authenticated caller
    auth.uid() = user_id
    AND
    -- Caller must have an active subscription OR be an admin
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.subscription_active = true
          OR profiles.role IN ('admin', 'creator_admin')
        )
    )
  );
