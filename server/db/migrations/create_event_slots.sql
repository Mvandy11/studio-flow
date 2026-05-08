-- Run in Supabase SQL Editor AFTER create_custom_event_requests.sql.
-- Creates the event_slots table for admin-assigned upload slots.

CREATE TABLE IF NOT EXISTS event_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id  uuid REFERENCES custom_event_requests(id) ON DELETE SET NULL,
  title       text NOT NULL,
  password    text NOT NULL,
  video_id    uuid,           -- set after the creator uploads their video
  video_url   text,           -- public URL of the uploaded video
  created_at  timestamptz DEFAULT now()
);

-- Allow service role full access
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
