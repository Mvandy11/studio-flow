-- Identity profiles (member's AI character)
CREATE TABLE IF NOT EXISTS identity_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  selfie_url TEXT NOT NULL,
  voice_url TEXT,
  persona_description TEXT,
  did_actor_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions (a generator project)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  identity_id UUID REFERENCES identity_profiles(id) ON DELETE SET NULL,
  title TEXT,
  description TEXT,
  scenes JSONB DEFAULT '[]',
  thumbnail_url TEXT,
  status TEXT DEFAULT 'draft',
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Render jobs (one per generate attempt)
CREATE TABLE IF NOT EXISTS render_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  did_talk_id TEXT,
  status TEXT DEFAULT 'pending',
  video_url TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Monthly render tracking
CREATE TABLE IF NOT EXISTS generator_render_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  UNIQUE(member_id, month)
);

-- RLS
ALTER TABLE identity_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generator_render_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage own identities" ON identity_profiles FOR ALL USING (auth.uid() = member_id);
CREATE POLICY "Members manage own sessions" ON sessions FOR ALL USING (auth.uid() = member_id);
CREATE POLICY "Members manage own render jobs" ON render_jobs FOR ALL USING (auth.uid() = member_id);
CREATE POLICY "Members manage own render counts" ON generator_render_counts FOR ALL USING (auth.uid() = member_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('selfies', 'selfies', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('voices', 'voices', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Members upload selfies" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'selfies' AND auth.role() = 'authenticated');
CREATE POLICY "Public read selfies" ON storage.objects FOR SELECT USING (bucket_id = 'selfies');
CREATE POLICY "Members upload voices" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'voices' AND auth.role() = 'authenticated');
CREATE POLICY "Public read voices" ON storage.objects FOR SELECT USING (bucket_id = 'voices');

-- Add studio_creator tier to memberships
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
