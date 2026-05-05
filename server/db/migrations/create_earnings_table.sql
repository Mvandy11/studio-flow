-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS earnings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id         UUID,
  contest_id       UUID,
  amount           NUMERIC(10,2) NOT NULL,
  source           TEXT NOT NULL,       -- 'ticket_sale' | 'contest_prize' | 'event_revenue'
  status           TEXT DEFAULT 'pending', -- 'pending' | 'requested' | 'paid' | 'failed'
  payout_method    TEXT,                -- method at time of sale
  payout_reference TEXT,               -- transaction ID once paid
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  paid_at          TIMESTAMPTZ
);

ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own earnings" ON earnings
  FOR SELECT USING (auth.uid() = creator_id);
