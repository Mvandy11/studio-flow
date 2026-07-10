import { supabase } from './supabase';

export async function createSession({ member_id, identity_id, title, description, scenes }) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ member_id, identity_id, title, description, scenes: scenes || [], status: 'draft' })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateSession(id, updates) {
  const { data, error } = await supabase
    .from('sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function getSessionById(id) {
  const { data, error } = await supabase
    .from('sessions').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getSessionsForMember(member_id) {
  const { data, error } = await supabase
    .from('sessions').select('*').eq('member_id', member_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
