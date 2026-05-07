-- Run in Supabase SQL Editor.
-- Creates the admin-only announcements table.

CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  pinned      BOOLEAN DEFAULT false,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned  ON announcements(pinned DESC);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read announcements"  ON announcements;
DROP POLICY IF EXISTS "Admin insert announcements" ON announcements;
DROP POLICY IF EXISTS "Admin update announcements" ON announcements;
DROP POLICY IF EXISTS "Admin delete announcements" ON announcements;

-- Anyone can read
CREATE POLICY "Public read announcements"
  ON announcements FOR SELECT USING (true);

-- Only creator_admin role can write (enforce via API; RLS allows any authed user as fallback)
CREATE POLICY "Admin insert announcements"
  ON announcements FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin update announcements"
  ON announcements FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin delete announcements"
  ON announcements FOR DELETE
  USING (auth.uid() IS NOT NULL);
