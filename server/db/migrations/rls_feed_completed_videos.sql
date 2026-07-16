-- Allow all authenticated users to read completed render_jobs (public feed).
-- Run in Supabase SQL editor.

DROP POLICY IF EXISTS "Authenticated users can view completed videos" ON render_jobs;

CREATE POLICY "Authenticated users can view completed videos"
  ON render_jobs FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'completed');
