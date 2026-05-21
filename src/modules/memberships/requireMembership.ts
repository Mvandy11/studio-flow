import { isAdminRole } from '../../lib/isAdmin';

export interface MembershipGateOptions {
  role?: string | null;
  /** profiles.subscription_active — set by Stripe webhook */
  subscriptionActive?: boolean;
}

/**
 * Returns true when the caller has access to premium features.
 * Admins always pass. Active subscription qualifies a regular user.
 */
export function requireMembership({
  role,
  subscriptionActive,
}: MembershipGateOptions): boolean {
  if (isAdminRole(role)) return true;
  if (subscriptionActive) return true;
  return false;
}
