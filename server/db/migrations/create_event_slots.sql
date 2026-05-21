-- Run in Supabase SQL Editor AFTER create_custom_event_requests.sql.
-- Creates the event_slots table for admin-assigned upload slots.
-- For existing databases that already have this table, run
--   add_stream_key_to_event_slots.sql  instead.

CREATE TABLE IF NOT EXISTS event_slots (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES auth.users(id)              ON DELETE CASCADE,
  request_id    uuid        REFERENCES custom_event_requests(id)   ON DELETE SET NULL,
  submission_id uuid,                     -- set when created from a submission approval
  title         text        NOT NULL,
  password      text        NOT NULL,
  stream_key    text,                     -- auto-generated on slot creation; used for live events
  stream_url    text,                     -- RTMP / HLS ingest URL (optional)
  video_id      uuid,                     -- set after the creator uploads their video
  video_url     text,                     -- public URL of the uploaded video
  created_at    timestamptz DEFAULT now()
);

-- Allow service role full access (used by the API server with SUPABASE_SERVICE_ROLE_KEY)
ALTER TABLE event_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on event_slots"
  ON event_slots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow slot owner to read their own slot
CREATE POLICY "Users can read own event slots"
  ON event_slots
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
