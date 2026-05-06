-- Run this in your Supabase SQL Editor.
-- Creates the events table and applies RLS policies.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.

CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  thumbnail_url   TEXT,
  date            TEXT,                         -- human-readable e.g. "June 14, 2026"
  location        TEXT,                         -- venue / city
  price           NUMERIC(10,2) DEFAULT 0,      -- 0 = free, 2 = standard, 5 = premium
  ticket_price    NUMERIC(10,2),                -- alias used by CreateEventPage (optional)
  is_paid_event   BOOLEAN DEFAULT false,
  stage_room_id   TEXT,
  creator_id      UUID REFERENCES auth.users(id),
  starts_at       TIMESTAMPTZ,
  backstage_pass  BOOLEAN DEFAULT false,
  seat_limit      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read events"  ON events;
DROP POLICY IF EXISTS "Auth insert events"  ON events;
DROP POLICY IF EXISTS "Owner update events" ON events;

CREATE POLICY "Public read events"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "Auth insert events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Owner update events"
  ON events FOR UPDATE
  USING (auth.uid() = creator_id);
