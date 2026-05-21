import { supabase } from './supabaseClient';

// Create a new session
export async function createSession({ creator_id, title, description, livestream_url, start_time }) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      creator_id,
      title,
      description,
      livestream_url,
      start_time,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update a session
export async function updateSession(id, updates) {
  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get a session by ID
export async function getSessionById(id) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Get all sessions for a specific creator
export async function getSessionsForCreator(creator_id) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('creator_id', creator_id)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data;
}

// Get upcoming sessions (future start_time)
export async function getUpcomingSessions() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .gte('start_time', now)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data;
}

// Create a feed event for a session
export async function createSessionFeedEvent(session_id, creator_id) {
  const { data, error } = await supabase
    .from('feed_events')
    .insert({
      creator_id,
      event_type: 'session',
      event_id: session_id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
