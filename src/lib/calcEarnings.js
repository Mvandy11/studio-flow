/**
 * Calculate potential earnings for a paid event.
 *
 * @param {{ ticketPrice: number, membershipCost: number, quantity: number }}
 * @returns {{ revenue: number, breakEvenTickets: number, profit: number }}
 */
export function calculateEarnings({ ticketPrice, membershipCost, quantity }) {
  const price = Number(ticketPrice) || 0;
  const cost = Number(membershipCost) || 0;
  const qty = Number(quantity) || 0;

  const revenue = price * qty;
  const breakEvenTickets = price > 0 ? Math.ceil(cost / price) : 0;
  const profit = revenue - cost;

  return { revenue, breakEvenTickets, profit };
}
