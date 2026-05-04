/**
 * Studio Flow — Stripe Payment Link registry.
 *
 * Three globally-fixed links. All tickets and memberships route through these.
 *
 *  $2  → Standard event admission
 *  $5  → Premium event admission
 *  $20 → Contest ticket (view + vote)
 *
 * ⚠️  ACTION REQUIRED: Replace CONTEST_STRIPE_LINK below with your real
 *     $20 Stripe Payment Link from the Stripe dashboard once created.
 *     Current value is a placeholder pointing to the $5 link.
 */

// TODO: Replace with actual $20 Stripe Payment Link
const CONTEST_STRIPE_LINK = 'https://buy.stripe.com/aFa28tddbcgofnmcl7b7y08';

export const STRIPE_LINKS = {
  2:  'https://buy.stripe.com/14A6oJgpna8g8YYbh3b7y0a',
  5:  'https://buy.stripe.com/aFa28tddbcgofnmcl7b7y08',
  20: CONTEST_STRIPE_LINK,
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
 * Picked up by the Success page on return.
 *
 * @param {object} intent
 * @param {string} intent.userId        - Supabase auth user ID
 * @param {string} intent.eventId       - monthly contest ID or event ID
 * @param {string} intent.eventTitle    - human-readable name
 * @param {string} intent.ticketType    - 'contest' | 'paid'
 * @param {number} intent.amount        - 2, 5, or 20
 * @param {string} intent.category      - 'contest' | 'event'
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

/** Returns Stripe price tier for an event price (2 or 5). */
export function priceTier(price) {
  return price <= 2 ? 2 : 5;
}
