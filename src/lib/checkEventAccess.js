import { isCreatorAdmin } from './roles';

/**
 * Checks whether the given user is allowed to enter an event's stage.
 *
 * Rules:
 *  - creator_admin role  → always allowed (full free access, no charge)
 *  - Free event          → always allowed
 *  - Paid event          → allowed only if a matching row exists in event_tickets
 *
 * @param {{ supabase: object, eventId: string, user: object|null, role?: string }} params
 * @returns {{ allowed: boolean, stageRoomId?: string }}
 */
export async function checkEventAccess({ supabase, eventId, user, role }) {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, is_paid_event, stage_room_id')
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    throw new Error(eventError?.message ?? 'Event not found');
  }

  const stageRoomId = event.stage_room_id;

  // creator_admin bypasses all payment gates unconditionally
  if (isCreatorAdmin(role)) {
    return { allowed: true, stageRoomId };
  }

  if (!event.is_paid_event) {
    return { allowed: true, stageRoomId };
  }

  if (!user) {
    return { allowed: false };
  }

  const { data: ticket, error: ticketError } = await supabase
    .from('event_tickets')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (ticketError) {
    throw new Error(ticketError.message);
  }

  if (ticket) {
    return { allowed: true, stageRoomId };
  }

  return { allowed: false };
}
