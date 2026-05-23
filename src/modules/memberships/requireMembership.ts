import { isAdminRole } from '../../lib/isAdmin';

export interface MembershipGateOptions {
  role?: string | null;
  /** profiles.subscription_active — set by Stripe webhook (legacy) */
  subscriptionActive?: boolean;
  /** profiles.membership_active — set by Payment Link activation */
  membershipActive?: boolean;
  /** profiles.has_access — convenience OR of both paths (preferred) */
  hasAccessFlag?: boolean;
}

/**
 * Returns true when the caller has access to premium features.
 * Admins always pass. Either activation path (webhook or payment link) qualifies.
 */
export function requireMembership({
  role,
  subscriptionActive,
  membershipActive,
  hasAccessFlag,
}: MembershipGateOptions): boolean {
  if (isAdminRole(role)) return true;
  if (hasAccessFlag) return true;
  if (membershipActive) return true;
  if (subscriptionActive) return true;
  return false;
}
