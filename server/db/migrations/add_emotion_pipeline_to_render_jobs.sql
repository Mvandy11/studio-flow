-- Emotion detection pipeline: adds emotion + rewritten_script to render_jobs.
-- render_status is a plain TEXT column, so no enum migration is needed;
-- the column now simply accepts these additional string values in sequence:
--   pending -> awaiting_emotion -> emotion_detected -> rendering -> completed -> error
-- Existing rows with status 'pending' or 'rendering' are untouched by this migration.

ALTER TABLE render_jobs ADD COLUMN IF NOT EXISTS emotion TEXT;
ALTER TABLE render_jobs ADD COLUMN IF NOT EXISTS rewritten_script TEXT;

-- These three did not previously exist on render_jobs. They are required so the
-- emotion-callback endpoint (a separate HTTP request, with no closure access to
-- the original /render request) can look up what it needs to actually kick off
-- rendering once Make.com calls back.
ALTER TABLE render_jobs ADD COLUMN IF NOT EXISTS script_text TEXT;
ALTER TABLE render_jobs ADD COLUMN IF NOT EXISTS identity_url TEXT;
ALTER TABLE render_jobs ADD COLUMN IF NOT EXISTS voice_id TEXT;

COMMENT ON COLUMN render_jobs.emotion IS 'One of: excited, urgent, warm, calm, intense, confident';
COMMENT ON COLUMN render_jobs.rewritten_script IS 'GPT-4o emotionally enhanced rewrite of the original script_text, produced by the Make.com AI Architect scenario';
COMMENT ON COLUMN render_jobs.script_text IS 'Original user-submitted script, kept as-is for reference';
COMMENT ON COLUMN render_jobs.identity_url IS 'Selfie/identity image URL used for rendering, captured at job creation time';
COMMENT ON COLUMN render_jobs.voice_id IS 'ElevenLabs voice ID used for rendering, captured at job creation time';
