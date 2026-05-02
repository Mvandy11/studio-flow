/**
 * Inserts a paid ticket row into event_tickets, then auto-issues
 * one free view-only ticket into free_tickets for the same event.
 *
 * @param {object} supabase - Supabase client instance
 * @param {string} eventId  - UUID of the event
 * @param {string} userId   - UUID of the purchasing user
 * @returns {{ ticket: object, freeTicket: object|null }}
 */
export async function createTicket(supabase, eventId, userId) {
  // 1. Insert the paid ticket
  const { data: ticket, error } = await supabase
    .from('event_tickets')
    .insert({
      event_id:          eventId,
      user_id:           userId,
      payment_reference: `payment-${Date.now()}`,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // 2. Auto-issue one free viewing ticket (best-effort, never throws)
  let freeTicket = null;
  try {
    const { data: ft, error: ftErr } = await supabase
      .from('free_tickets')
      .insert({
        event_id:         eventId,
        user_id:          userId,
        ticket_type:      'view_only',
        source_ticket_id: ticket.id,
      })
      .select()
      .single();

    if (!ftErr) freeTicket = ft;
  } catch (_) {
    // free_tickets table may not exist yet — silent fail
  }

  return { ticket, freeTicket };
}
