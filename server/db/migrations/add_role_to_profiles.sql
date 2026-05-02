-- ── Step 1: Add role column to profiles ───────────────────────────────────
-- Run this in your Supabase SQL Editor (Database → SQL Editor).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'creator', 'creator_admin'));

-- ── Step 2: Assign creator_admin to Michael Vandeventer ───────────────────
-- Replace 'michael@example.com' with his actual Supabase account email.

UPDATE profiles
SET role = 'creator_admin'
WHERE id = (
  SELECT id
  FROM auth.users
  WHERE email = 'michael@example.com'   -- ← replace with Michael's email
);

-- Verify the change was applied:
SELECT p.id, u.email, p.role
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'creator_admin';
