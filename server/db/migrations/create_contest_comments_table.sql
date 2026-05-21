-- Migration: create_contest_comments
-- Run this in your Supabase SQL Editor for a FRESH install.
-- For an existing database that already has this table, run
--   add_contest_id_to_contest_comments.sql  instead.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.contest_comments (
  id          uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  contest_id  uuid        REFERENCES public.contests(id)  ON DELETE CASCADE,
  entry_id    uuid,                -- NULL → contest-level comment; set → per-entry comment
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name   text,
  content     text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cc_contest_id ON public.contest_comments (contest_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cc_entry_id   ON public.contest_comments (entry_id,   created_at ASC)
  WHERE entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cc_user_id    ON public.contest_comments (user_id);

ALTER TABLE public.contest_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "contest_comments_select_public"
  ON public.contest_comments FOR SELECT
  USING (true);

-- Authenticated users can insert their own rows
CREATE POLICY "contest_comments_insert_auth"
  ON public.contest_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own comments
CREATE POLICY "contest_comments_delete_own"
  ON public.contest_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
