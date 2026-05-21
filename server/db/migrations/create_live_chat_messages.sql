-- Live Chat Messages
-- Scoped to event_slots via slot_id.
-- Completely separate from free-chat (chat_messages table) and
-- contest chat (contest_comments table).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS live_chat_messages (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id    uuid        REFERENCES event_slots(id) ON DELETE CASCADE,
  user_id    uuid        REFERENCES profiles(id)    ON DELETE SET NULL,
  content    text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_chat_messages_slot_id_idx
  ON live_chat_messages (slot_id, created_at);

-- RLS
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can read live chat"
  ON public.live_chat_messages
  FOR SELECT
  USING (true);

-- Auth users can insert their own messages
CREATE POLICY "Authenticated users can send live chat"
  ON public.live_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role full access (server-side inserts bypass RLS anyway)
CREATE POLICY "Service role full access on live_chat_messages"
  ON public.live_chat_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Let PostgREST broadcast realtime events for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;

NOTIFY pgrst, 'reload schema';
