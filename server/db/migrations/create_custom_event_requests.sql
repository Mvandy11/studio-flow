-- Run in Supabase SQL Editor.
-- Creates the custom_event_requests table for creator event slot requests.

CREATE TABLE IF NOT EXISTS custom_event_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL,
  event_type   text NOT NULL,
  price        numeric,
  description  text,
  status       text DEFAULT 'pending',
  created_at   timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Allow service role full access
ALTER TABLE custom_event_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on custom_event_requests"
  ON custom_event_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow users to read their own requests
CREATE POLICY "Users can read own requests"
  ON custom_event_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own requests
CREATE POLICY "Users can insert own requests"
  ON custom_event_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
