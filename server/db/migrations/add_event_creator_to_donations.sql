-- Run in Supabase SQL Editor.
-- Extends the donations table with event and creator tracking columns.

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS event_id    uuid REFERENCES event_slots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creator_id  uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Index for fast per-event and per-creator queries
CREATE INDEX IF NOT EXISTS donations_event_id_idx    ON donations (event_id);
CREATE INDEX IF NOT EXISTS donations_creator_id_idx  ON donations (creator_id);

-- Allow authenticated users to insert their own donation rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'donations' AND policyname = 'Users can insert own donations'
  ) THEN
    CREATE POLICY "Users can insert own donations"
      ON donations FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow creators to read donations they received
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'donations' AND policyname = 'Creators can read donations to them'
  ) THEN
    CREATE POLICY "Creators can read donations to them"
      ON donations FOR SELECT TO authenticated
      USING (auth.uid() = creator_id OR auth.uid() = user_id);
  END IF;
END $$;

-- Allow public (anon) to read aggregate donation data per event
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'donations' AND policyname = 'Public can read event donations'
  ) THEN
    CREATE POLICY "Public can read event donations"
      ON donations FOR SELECT TO anon
      USING (true);
  END IF;
END $$;
