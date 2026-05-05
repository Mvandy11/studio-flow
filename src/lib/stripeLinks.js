/**
 * Studio Flow — Stripe Payment Link registry.
 *
 * Two globally-fixed links. All tickets route through these.
 *
 *  $2  → Standard event admission
 *  $5  → Premium event admission / contest ticket (view + vote)
 */

export const STRIPE_LINKS = {
  2: 'https://buy.stripe.com/14A6oJgpna8g8YYbh3b7y0a',
  5: 'https://buy.stripe.com/aFa28tddbcgofnmcl7b7y08',
};

/**
 * Returns the correct Stripe payment link for the given price tier.
 * Falls back to the $5 link for any unexpected price.
 */
export function getStripeLink(price) {
  return STRIPE_LINKS[price] ?? STRIPE_LINKS[5];
}

/**
 * Builds the full Stripe URL with optional pre-filled email and
 * a compact client_reference_id for audit purposes.
 */
export function buildStripeUrl(price, opts = {}) {
  const base = getStripeLink(price);
  const params = new URLSearchParams();
  if (opts.email)             params.set('prefilled_email',     opts.email);
  if (opts.clientReferenceId) params.set('client_reference_id', opts.clientReferenceId);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Saves ticket purchase intent to localStorage before the Stripe redirect.
 * Picked up by the PaymentSuccess page on return.
 *
 * @param {object} intent
 * @param {string} intent.userId         - Supabase auth user ID
 * @param {string} intent.eventId        - monthly contest ID or event UUID
 * @param {string} intent.eventTitle     - human-readable name
 * @param {string} intent.ticketType     - 'contest' | 'paid'
 * @param {number} intent.amount         - 2 or 5
 * @param {string} intent.category       - 'contest' | 'event'
 * @param {boolean} intent.votingAllowed - whether this ticket grants voting
 */
export function saveTicketIntent(intent) {
  localStorage.setItem(
    'sf_ticket_intent',
    JSON.stringify({ ...intent, ts: Date.now() })
  );
}

/**
 * Reads and removes the saved intent from localStorage.
 * Returns null if missing, malformed, or older than 2 hours.
 */
export function popTicketIntent() {
  try {
    const raw = localStorage.getItem('sf_ticket_intent');
    if (!raw) return null;
    localStorage.removeItem('sf_ticket_intent');
    const intent = JSON.parse(raw);
    if (Date.now() - intent.ts > 7_200_000) return null;
    return intent;
  } catch {
    return null;
  }
}

/** Returns Stripe price tier for a given price (2 or 5). */
export function priceTier(price) {
  return price <= 2 ? 2 : 5;
}
