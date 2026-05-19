-- ============================================================
-- Chat: advanced features migration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Extend chat_messages with channel / thread / announcement support
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS channel_id        TEXT        NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS parent_message_id UUID        REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_announcement   BOOLEAN     NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel
  ON public.chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_parent
  ON public.chat_messages(parent_message_id);

-- 2. Enable RLS on chat_messages if not already
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_messages' AND policyname = 'Public read chat messages'
  ) THEN
    CREATE POLICY "Public read chat messages"
      ON public.chat_messages FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_messages' AND policyname = 'Auth insert chat messages'
  ) THEN
    CREATE POLICY "Auth insert chat messages"
      ON public.chat_messages FOR INSERT
      WITH CHECK (auth.uid() = sender_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_messages' AND policyname = 'Admin delete chat messages'
  ) THEN
    CREATE POLICY "Admin delete chat messages"
      ON public.chat_messages FOR DELETE
      USING (
        auth.uid() = sender_id
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin','creator_admin')
        )
      );
  END IF;
END $$;

-- 3. Message reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL,
  emoji      TEXT        NOT NULL CHECK (char_length(emoji) <= 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read reactions"
  ON public.message_reactions FOR SELECT USING (true);
CREATE POLICY "Auth insert reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth delete own reactions"
  ON public.message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Chat read state (unread badges)
CREATE TABLE IF NOT EXISTS public.chat_read_state (
  user_id      UUID        NOT NULL,
  channel_id   TEXT        NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, channel_id)
);

ALTER TABLE public.chat_read_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own read state only"
  ON public.chat_read_state FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
