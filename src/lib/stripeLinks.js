/**
 * Studio Flow — Stripe Payment Link registry.
 * Only two payment links exist globally. All tickets map to one of these.
 *
 *  $2 → standard event admission (casual events, free-form nights)
 *  $5 → premium events + all contest viewing/voting tickets
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
 *
 * @param {number}  price  - 2 or 5
 * @param {object}  opts
 * @param {string}  opts.email              - pre-fill buyer email
 * @param {string}  opts.clientReferenceId  - compact ID for Stripe audit log
 */
export function buildStripeUrl(price, opts = {}) {
  const base = getStripeLink(price);
  const params = new URLSearchParams();
  if (opts.email)             params.set('prefilled_email',    opts.email);
  if (opts.clientReferenceId) params.set('client_reference_id', opts.clientReferenceId);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Saves ticket purchase intent to localStorage before the Stripe redirect.
 * Picked up by the Success page on return.
 *
 * @param {object} intent
 * @param {string} intent.userId       - Supabase auth user ID
 * @param {string} intent.eventId      - contest or event ID (e.g. 'contest-funny', 'ev-showcase')
 * @param {string} intent.eventTitle   - human-readable name
 * @param {string} intent.ticketType   - 'voting' | 'paid'
 * @param {number} intent.amount       - 2 or 5
 * @param {string} intent.category     - 'contest' | 'event'
 */
export function saveTicketIntent(intent) {
  localStorage.setItem(
    'sf_ticket_intent',
    JSON.stringify({ ...intent, ts: Date.now() })
  );
}

/**
 * Reads and removes the saved intent from localStorage.
 * Returns null if the intent is missing, malformed, or older than 2 hours.
 */
export function popTicketIntent() {
  try {
    const raw = localStorage.getItem('sf_ticket_intent');
    if (!raw) return null;
    localStorage.removeItem('sf_ticket_intent');
    const intent = JSON.parse(raw);
    if (Date.now() - intent.ts > 7_200_000) return null; // 2-hour expiry
    return intent;
  } catch {
    return null;
  }
}

/**
 * Returns the Stripe price tier (2 or 5) for a given nominal event price.
 * Maps anything ≤ $2 to the $2 tier, everything else to the $5 tier.
 */
export function priceTier(price) {
  return price <= 2 ? 2 : 5;
}
