-- Add script and scene_description columns to identities table
ALTER TABLE identities ADD COLUMN IF NOT EXISTS script TEXT;
ALTER TABLE identities ADD COLUMN IF NOT EXISTS scene_description TEXT;
