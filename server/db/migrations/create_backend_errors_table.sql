-- Backend error log — populated by the Express global error handler and
-- individual catch blocks via server/utils/logError.js.
-- Only the service-role key (used by supabaseAdmin) can insert.
-- Only admin users can read.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS backend_errors (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message    text,
  stack      text,
  route      text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS backend_errors_created_at_idx
  ON backend_errors (created_at DESC);

-- RLS
ALTER TABLE public.backend_errors ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (server inserts bypass RLS anyway)
CREATE POLICY "Service role full access on backend_errors"
  ON public.backend_errors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin users (profiles.role = 'admin' OR 'creator_admin') can SELECT
CREATE POLICY "Admin users can read backend_errors"
  ON public.backend_errors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'creator_admin')
    )
  );

NOTIFY pgrst, 'reload schema';
