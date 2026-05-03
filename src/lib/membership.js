/**
 * Studio Flow — Membership pricing constants.
 * Single source of truth for the yearly plan across the entire app.
 *
 * Plan: Studio Flow Annual Access
 *   Price:  $75 / year (one-time yearly payment)
 *   Trial:  30 days free
 *   Refund: No refunds under any circumstances.
 */

export const MEMBERSHIP = {
  price:        75,
  period:       'year',
  label:        '$75 / year',
  trialDays:    30,
  stripeLink:   'https://buy.stripe.com/6oU8wRehfa8g0ssbh3b7y0f',
  ctaShort:     'Join Studio Flow — $75/year',
  ctaFull:      'Start Free Trial — $75/year after 30 days',
  trialBadge:   '30-day free trial included',
  refundPolicy: 'No refunds are provided for this product under any circumstances.',
};

/** Returns the correct membership Stripe link (always the yearly link). */
export function getMembershipLink() {
  return MEMBERSHIP.stripeLink;
}
