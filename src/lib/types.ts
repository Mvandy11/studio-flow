// ── Studio Flow — shared TypeScript interfaces ────────────────
// Matches the Supabase schema as of the latest migrations.

export interface Profile {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: 'user' | 'creator' | 'creator_admin' | 'admin';
  subscription_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Membership {
  id: string;
  user_id: string;
  tier: 'free' | 'monthly' | 'enterprise';
  is_active: boolean;
  started_at: string | null;
  expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contest {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'voting' | 'completed' | 'archived';
  category: string | null;
  prize_amount: number | null;
  thumbnail_url: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ContestEntry {
  id: string;
  contest_id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  storage_path: string | null;
  submitter_email: string | null;
  vote_count: number;
  created_at: string;
}

export interface ContestVote {
  id: string;
  contest_id: string;
  entry_id: string;
  user_id: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}
