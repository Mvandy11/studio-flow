ALTER TABLE revenue_pool_entries
  ADD COLUMN IF NOT EXISTS contest_allocation NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_allocation NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'founding',
  ADD COLUMN IF NOT EXISTS month TEXT;

ALTER TABLE memberships ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'founding';
UPDATE memberships SET tier = 'founding' WHERE tier IS NULL OR tier = 'free';
