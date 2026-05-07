-- Run in Supabase SQL Editor.
-- Drops old contest-voting and membership-gate tables.
-- NOTE: event_tickets is kept — paid events still use it for access control.

DROP TABLE IF EXISTS contest_votes     CASCADE;
DROP TABLE IF EXISTS free_tickets      CASCADE;
DROP TABLE IF EXISTS ticket_ledger     CASCADE;
DROP TABLE IF EXISTS membership_tiers  CASCADE;
DROP TABLE IF EXISTS stripe_links      CASCADE;
DROP TABLE IF EXISTS ticket_types      CASCADE;
