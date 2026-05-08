-- Run in Supabase SQL Editor. Requires event_slots table to exist first.
-- Tracks payments for custom locked/ticketed events.
-- Stores 98/2 payout split (98% creator, 2% platform).

CREATE TABLE IF NOT EXISTS event_payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slot_id         uuid REFERENCES event_slots(id) ON DELETE CASCADE,
  buyer_user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount                numeric NOT NULL,
  stripe_payment_id     text,
  creator_payout_amount numeric,
  studio_fee_amount     numeric,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE event_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on event_payments"
  ON event_payments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Buyers can read own payments"
  ON event_payments FOR SELECT TO authenticated
  USING (auth.uid() = buyer_user_id);
