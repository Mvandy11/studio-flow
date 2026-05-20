-- ====================================================
-- StudioFlow v2 Schema Repair — run in Supabase SQL Editor
-- Safe to run more than once (all statements are idempotent).
-- Run order matters — execute this file top-to-bottom.
-- ====================================================

-- ──────────────────────────────────────────────────
-- 1. MEMBERSHIPS TABLE
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.memberships (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                   TEXT        NOT NULL DEFAULT 'free'
                                     CHECK (tier IN ('free','monthly','enterprise')),
  is_active              BOOLEAN     NOT NULL DEFAULT false,
  started_at             TIMESTAMPTZ,
  expires_at             TIMESTAMPTZ,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user   ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_active ON public.memberships(is_active);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner memberships"   ON public.memberships;
DROP POLICY IF EXISTS "Service memberships" ON public.memberships;

CREATE POLICY "Owner memberships"
  ON public.memberships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service memberships"
  ON public.memberships FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ──────────────────────────────────────────────────
-- 2. CHAT MESSAGES — create or align
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        TEXT        NOT NULL DEFAULT 'general',
  channel_id        TEXT        NOT NULL DEFAULT 'general',
  user_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  content           TEXT        NOT NULL,
  parent_message_id UUID        REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  is_announcement   BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Rename old columns if the table was created with the original schema ──────
-- (These are no-ops if the columns don't exist; Postgres will raise an error
--  only if the column already has the new name — wrap each in a DO block.)
DO $$ BEGIN
  ALTER TABLE public.chat_messages RENAME COLUMN sender_id TO user_id;
EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.chat_messages RENAME COLUMN message TO content;
EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;

-- Add new columns idempotently in case this is an older install
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS channel_id        TEXT    NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS parent_message_id UUID    REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_announcement   BOOLEAN NOT NULL DEFAULT false;

-- Back-fill channel_id from session_id for any existing rows
UPDATE public.chat_messages
  SET channel_id = session_id
  WHERE channel_id = 'general' AND session_id IS NOT NULL AND session_id <> 'general';

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON public.chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_parent  ON public.chat_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read chat messages"  ON public.chat_messages;
DROP POLICY IF EXISTS "Auth insert chat messages"  ON public.chat_messages;
DROP POLICY IF EXISTS "Admin delete chat messages" ON public.chat_messages;

CREATE POLICY "Public read chat messages"
  ON public.chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Auth insert chat messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin delete chat messages"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','creator_admin')
    )
  );


-- ──────────────────────────────────────────────────
-- 3. MESSAGE REACTIONS
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, reaction)
);

-- Rename emoji → reaction if the table was created with the old column name
DO $$ BEGIN
  ALTER TABLE public.message_reactions RENAME COLUMN emoji TO reaction;
EXCEPTION WHEN undefined_column OR duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_reactions_message ON public.message_reactions(message_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read reactions"  ON public.message_reactions;
DROP POLICY IF EXISTS "Auth upsert reactions"  ON public.message_reactions;
DROP POLICY IF EXISTS "Owner delete reactions" ON public.message_reactions;

CREATE POLICY "Public read reactions"
  ON public.message_reactions FOR SELECT USING (true);

CREATE POLICY "Auth upsert reactions"
  ON public.message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner delete reactions"
  ON public.message_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ──────────────────────────────────────────────────
-- 4. CHAT READ STATE  (unread badges)
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_read_state (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id   TEXT        NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel_id)
);

ALTER TABLE public.chat_read_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner read state" ON public.chat_read_state;

CREATE POLICY "Owner read state"
  ON public.chat_read_state FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ──────────────────────────────────────────────────
-- 5. SUPABASE REALTIME — tables to enable
-- ──────────────────────────────────────────────────
-- After running this migration, go to:
--   Supabase Dashboard → Database → Replication
-- and enable Realtime on ALL of these tables:
--   public.chat_messages
--   public.message_reactions
--   public.chat_read_state
--   public.contest_entries
--   public.contest_votes


-- ──────────────────────────────────────────────────
-- 6. OPTIONAL — migrate free_chat_posts data
-- ──────────────────────────────────────────────────
-- If free_chat_posts still has data you want to keep, run this block:
--
-- INSERT INTO public.chat_messages
--   (session_id, channel_id, user_id, content, created_at)
-- SELECT
--   'general', 'general', user_id, message, created_at
-- FROM public.free_chat_posts
-- ON CONFLICT DO NOTHING;
--
-- DROP TABLE IF EXISTS public.free_chat_posts;
