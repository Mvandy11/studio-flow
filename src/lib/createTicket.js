/**
 * Inserts a ticket row into event_tickets after a successful (simulated) payment.
 *
 * @param {object} supabase - Supabase client instance
 * @param {string} eventId  - UUID of the event
 * @param {string} userId   - UUID of the purchasing user
 * @returns {object} the inserted ticket row
 */
export async function createTicket(supabase, eventId, userId) {
  const { data, error } = await supabase
    .from('event_tickets')
    .insert({
      event_id: eventId,
      user_id: userId,
      payment_reference: `test-payment-${Date.now()}`,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
