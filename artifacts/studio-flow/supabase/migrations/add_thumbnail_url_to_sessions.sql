-- Add thumbnail_url column to sessions table
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create Supabase Storage bucket for session thumbnails (run in Supabase dashboard if not using CLI)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('session-thumbnails', 'session-thumbnails', true)
-- ON CONFLICT (id) DO NOTHING;
