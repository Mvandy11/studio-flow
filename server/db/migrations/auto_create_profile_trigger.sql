-- ============================================================
-- Migration: auto_create_profile_trigger
-- Automatically creates a profiles row whenever a new user
-- signs up via Supabase Auth.
-- Run once in your Supabase SQL Editor.
-- ============================================================

-- Ensure required columns exist on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email            TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name     TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role             TEXT    NOT NULL DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio              TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT now();

-- ── Trigger function ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    display_name,
    subscription_active,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1),
    split_part(NEW.email, '@', 1),
    false,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── Trigger binding ───────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Back-fill existing users who have no profile yet ─────────
INSERT INTO public.profiles (id, email, username, display_name, subscription_active, role)
SELECT
  u.id,
  u.email,
  split_part(u.email, '@', 1),
  split_part(u.email, '@', 1),
  false,
  'user'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Verify
SELECT count(*) AS profiles_created FROM public.profiles;
