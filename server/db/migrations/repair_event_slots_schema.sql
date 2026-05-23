-- Idempotent repair for event_slots.
-- Safely adds any columns that may be missing from older deployments.
-- Run this in the Supabase SQL Editor to fix:
--   "Could not find the 'hls_url' column of 'event_slots' in the schema cache"
--   and related errors for stream_key, stream_url, status, created_at.

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS stream_key  text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS stream_url  text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS hls_url     text;

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS status      text DEFAULT 'pending';

ALTER TABLE event_slots
  ADD COLUMN IF NOT EXISTS created_at  timestamptz DEFAULT now();

-- Force PostgREST to reload its schema cache immediately.
-- Without this, the API throws "could not find column" even after ALTER TABLE.
NOTIFY pgrst, 'reload schema';
