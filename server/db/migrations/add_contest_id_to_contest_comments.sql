-- Migration: add_contest_id_to_contest_comments
-- Run this in your Supabase SQL Editor if the contest_comments table
-- ALREADY EXISTS (created by the original migration that only had entry_id).
-- Safe to re-run — all statements use IF NOT EXISTS / IF EXISTS guards.

-- 1. Add contest_id column (nullable so existing rows are not broken)
ALTER TABLE public.contest_comments
  ADD COLUMN IF NOT EXISTS contest_id uuid REFERENCES public.contests(id) ON DELETE CASCADE;

-- 2. Add a covering index for the new per-contest query pattern
CREATE INDEX IF NOT EXISTS idx_cc_contest_id
  ON public.contest_comments (contest_id, created_at DESC);

-- 3. Make sure the per-entry index also exists
CREATE INDEX IF NOT EXISTS idx_cc_entry_id
  ON public.contest_comments (entry_id, created_at ASC)
  WHERE entry_id IS NOT NULL;

-- 4. Ensure the delete-own policy exists (older installs may be missing it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE tablename = 'contest_comments'
       AND policyname = 'contest_comments_delete_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "contest_comments_delete_own"
        ON public.contest_comments FOR DELETE TO authenticated
        USING (auth.uid() = user_id)
    $policy$;
  END IF;
END$$;
