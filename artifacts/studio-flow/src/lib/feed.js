import { supabase } from './supabase';

// Create a feed event (post or session)
export async function createFeedEvent({ creator_id, event_type, event_id }) {
  const { data, error } = await supabase
    .from('feed_events')
    .insert({
      creator_id,
      event_type,
      event_id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get feed for a user based on who they follow
export async function getFeedForUser(user_id) {
  // Step 1: get creators the user follows
  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('creator_id')
    .eq('follower_id', user_id);

  if (followsError) throw followsError;

  const creatorIds = follows.map((f) => f.creator_id);

  if (creatorIds.length === 0) return [];

  // Step 2: get feed events from those creators
  const { data: events, error: eventsError } = await supabase
    .from('feed_events')
    .select('*')
    .in('creator_id', creatorIds)
    .order('created_at', { ascending: false });

  if (eventsError) throw eventsError;

  return events;
}
