-- Run this in your Supabase SQL Editor.
-- Adds the new event_type, status, video/live fields to the existing events table.
-- Safe to re-run: uses IF NOT EXISTS / DO blocks.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_type       TEXT NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'upcoming',
  ADD COLUMN IF NOT EXISTS start_time       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS is_paid          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_url        TEXT,
  ADD COLUMN IF NOT EXISTS live_room_id     TEXT,
  ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES auth.users(id);

-- Back-fill start_time from starts_at where not already set
UPDATE events SET start_time = starts_at WHERE start_time IS NULL AND starts_at IS NOT NULL;

-- Back-fill is_paid from is_paid_event where not already set
UPDATE events SET is_paid = is_paid_event WHERE is_paid IS FALSE AND is_paid_event IS TRUE;

-- Back-fill live_room_id from stage_room_id
UPDATE events SET live_room_id = stage_room_id WHERE live_room_id IS NULL AND stage_room_id IS NOT NULL;

-- Back-fill created_by from creator_id
UPDATE events SET created_by = creator_id WHERE created_by IS NULL AND creator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_status    ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_type      ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_starttime ON events(start_time ASC);

-- Allow admin service-role updates (RLS already allows owner updates)
DROP POLICY IF EXISTS "Admin delete events" ON events;
CREATE POLICY "Admin delete events"
  ON events FOR DELETE
  USING (auth.uid() = creator_id);
