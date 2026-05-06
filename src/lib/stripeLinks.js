/**
 * Studio Flow — Stripe Payment Link registry.
 *
 * Separate link sets for contest tickets and event viewing tickets.
 */

// ── Contest Stripe Payment Links ──────────────────────────────
export const CONTEST_LINKS = {
  2: 'https://buy.stripe.com/14A6oJgpna8g8YYbh3b7y0a',
  5: 'https://buy.stripe.com/aFa28tddbcgofnmcl7b7y08',
};

// ── Event Viewing Stripe Payment Links ────────────────────────
export const EVENT_LINKS = {
  2: 'https://buy.stripe.com/eVq8wR3CBdks5MM70Nb7y0n',
  5: 'https://buy.stripe.com/bJe8wR1utbck3EEacZb7y0m',
};

// ── Legacy alias (kept for any unupdated call sites) ──────────
export const STRIPE_LINKS = CONTEST_LINKS;

/**
 * Returns the correct Stripe payment link for the given price tier and type.
 * @param {number} price - 2 or 5
 * @param {'contest'|'event'} [type='contest'] - which link set to use
 */
export function getStripeLink(price, type = 'contest') {
  const links = type === 'event' ? EVENT_LINKS : CONTEST_LINKS;
  return links[price] ?? links[5];
}

/**
 * Builds the full Stripe URL with optional pre-filled email,
 * a compact client_reference_id, and type-aware link selection.
 *
 * @param {number} price - 2 or 5
 * @param {object} [opts]
 * @param {'contest'|'event'} [opts.type='contest'] - which link set to use
 * @param {string} [opts.email] - pre-fill email in Stripe checkout
 * @param {string} [opts.clientReferenceId] - audit reference
 */
export function buildStripeUrl(price, opts = {}) {
  const { type = 'contest', email, clientReferenceId } = opts;
  const base = getStripeLink(price, type);
  const params = new URLSearchParams();
  if (email)             params.set('prefilled_email',     email);
  if (clientReferenceId) params.set('client_reference_id', clientReferenceId);
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
