-- Migration: create_free_chat_posts
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS free_chat_posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT      NOT NULL DEFAULT 'Creator',
  message    TEXT        NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS free_chat_posts_created_at_idx
  ON free_chat_posts (created_at DESC);

-- Allow anyone to read; only the post author can insert their own row
ALTER TABLE free_chat_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON free_chat_posts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated insert own" ON free_chat_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
