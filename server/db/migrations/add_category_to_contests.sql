-- Run this in your Supabase SQL Editor.
-- Step 1: adds category column to contests table
-- Step 2: inserts the two comedy contests under 'creative' category

-- 1. Add category column (safe to run multiple times)
ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- 2. Insert the two comedy contests
INSERT INTO contests (
  title,
  description,
  thumbnail_url,
  entry_fee,
  prize_pool,
  winner_count,
  start_date,
  end_date,
  submission_start,
  submission_end,
  voting_start,
  voting_end,
  status,
  category
) VALUES
(
  'Funniest Baby Moments',
  'Submit your funniest baby moments — caught on camera! The most hilarious clip wins.',
  'https://placehold.co/400x300/1a1a2e/ffffff?text=Baby+Moments',
  0, 0, 1,
  NOW(),
  DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second',
  NOW(),
  DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second',
  NULL, NULL,
  'active',
  'creative'
),
(
  'World''s Funniest Video',
  'Think you''ve captured the world''s funniest video? Enter now and let the votes decide!',
  'https://placehold.co/400x300/1a1a2e/ffffff?text=Funniest+Video',
  0, 0, 1,
  NOW(),
  DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second',
  NOW(),
  DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second',
  NULL, NULL,
  'active',
  'creative'
);
