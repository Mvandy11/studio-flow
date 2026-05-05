-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS creator_settings (
  creator_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payout_method    TEXT DEFAULT 'studioflow-kofi',
  sf_product_link  TEXT,
  sf_event_title   TEXT,
  sf_event_date    TEXT,
  sf_event_time    TEXT,
  sf_thumbnail     TEXT,
  kofi_page        TEXT,
  kofi_donation    TEXT,
  kofi_membership  TEXT,
  kofi_shop        TEXT,
  paypal           TEXT,
  cashapp          TEXT,
  stripe           TEXT,
  venmo            TEXT,
  custom_url       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE creator_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings" ON creator_settings
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can upsert own settings" ON creator_settings
  FOR ALL USING (auth.uid() = creator_id);
