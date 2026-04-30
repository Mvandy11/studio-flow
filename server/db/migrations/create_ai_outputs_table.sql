-- Run once. Shared by Denoise, Upscale, and Enhance tools.
-- If the table already exists for your other tools, this is a no-op.

CREATE TABLE IF NOT EXISTS ai_outputs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool          TEXT NOT NULL,                        -- 'enhance' | 'denoise' | 'upscale'
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  public_url    TEXT,
  resolution    TEXT,                                 -- e.g. '1024x1024'
  width         INTEGER,
  height        INTEGER,
  format        TEXT DEFAULT 'png',
  original_name TEXT,
  quality       TEXT,
  size_bytes    BIGINT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for Library grid queries (filter by tool, sort by date)
CREATE INDEX IF NOT EXISTS idx_ai_outputs_tool_date
  ON ai_outputs (tool, created_at DESC);

-- RLS (adjust policies to match your auth setup)
ALTER TABLE ai_outputs ENABLE ROW LEVEL SECURITY;
