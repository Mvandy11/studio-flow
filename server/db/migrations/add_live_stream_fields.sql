-- ── Live Stream Fields ────────────────────────────────────────
-- Adds live streaming metadata to profiles and events tables.
-- Run once in your Supabase SQL Editor.

-- ── profiles ──────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS live_stream_url  TEXT,
  ADD COLUMN IF NOT EXISTS live_stream_type TEXT DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS is_live          BOOLEAN DEFAULT false;

-- ── events ────────────────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS live_stream_url TEXT,
  ADD COLUMN IF NOT EXISTS is_live         BOOLEAN DEFAULT false;

-- ── sessions ──────────────────────────────────────────────────
-- sessions already has livestream_url; add is_live flag.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;
