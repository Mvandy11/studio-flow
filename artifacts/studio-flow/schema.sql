-- Studio Flow Database Schema

-- 1. profiles
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text UNIQUE NOT NULL,
  display_name text,
  bio         text,
  avatar_url  text,
  created_at  timestamp with time zone DEFAULT now()
);

-- 2. sessions
CREATE TABLE sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title          text,
  description    text,
  livestream_url text,
  start_time     timestamp with time zone,
  created_at     timestamp with time zone DEFAULT now()
);

-- 3. follows
CREATE TABLE follows (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamp with time zone DEFAULT now(),
  UNIQUE (follower_id, creator_id)
);

-- 4. posts
CREATE TABLE posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content    text,
  image_url  text,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. feed_events
CREATE TABLE feed_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text CHECK (event_type IN ('post', 'session')),
  event_id   uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. chat_messages
CREATE TABLE chat_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message    text,
  created_at timestamp with time zone DEFAULT now()
);
