-- Add Payment Link-based membership columns to profiles.
-- Safe to run multiple times (all ADD COLUMN IF NOT EXISTS).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS membership_active     boolean      NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS membership_tier       text         NOT NULL DEFAULT 'free';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS membership_started_at timestamptz;

-- Force PostgREST to reload schema cache so the new columns are immediately visible.
NOTIFY pgrst, 'reload schema';
