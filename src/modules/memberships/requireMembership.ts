import { isAdminRole } from '../../lib/isAdmin';
import type { Membership } from '../../lib/types';

export interface MembershipGateOptions {
  role?: string | null;
  membership?: Membership | null;
  /** profiles.subscription_active from AuthContext */
  subscriptionActive?: boolean;
}

/**
 * Returns true when the caller has access to premium features.
 * Admins always pass. Active membership OR subscription_active flag qualifies a user.
 */
export function requireMembership({
  role,
  membership,
  subscriptionActive,
}: MembershipGateOptions): boolean {
  if (isAdminRole(role)) return true;
  if (subscriptionActive) return true;
  if (membership?.is_active) return true;
  return false;
}
