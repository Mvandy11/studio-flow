-- Add creator-direct-publish columns to event_slots.
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).
-- Run after repair_event_slots_schema.sql.

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS creator_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS category      text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS description   text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS is_live       boolean NOT NULL DEFAULT false;

-- Back-fill creator_id from user_id for existing rows
UPDATE event_slots
  SET creator_id = user_id
  WHERE creator_id IS NULL AND user_id IS NOT NULL;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_event_slots_category ON event_slots (category);

-- Allow any authenticated user to read published event slots
CREATE POLICY IF NOT EXISTS "Anyone can view published event slots"
  ON event_slots
  FOR SELECT
  TO authenticated
  USING (status IS NOT NULL);

-- Allow owners to insert their own slots
CREATE POLICY IF NOT EXISTS "Creators can insert own event slots"
  ON event_slots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

-- Allow owners to update/delete
CREATE POLICY IF NOT EXISTS "Creators can update own event slots"
  ON event_slots
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
