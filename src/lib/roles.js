/**
 * Studio Flow role constants.
 *
 * Roles (least → most privileged):
 *   user           — standard authenticated user
 *   creator        — content owner (owns sessions / events)
 *   creator_admin  — permanent super-user with full free access to every
 *                    feature, tool, event, session, and admin area
 */
export const ROLES = {
  USER:          'user',
  CREATOR:       'creator',
  CREATOR_ADMIN: 'creator_admin',
};

/** Returns true when the supplied role string is creator_admin. */
export function isCreatorAdmin(role) {
  return role === ROLES.CREATOR_ADMIN;
}

/**
 * Returns true when the user has at least creator-level privileges.
 * creator_admin always passes this check.
 */
export function isCreatorOrAdmin(role) {
  return role === ROLES.CREATOR || role === ROLES.CREATOR_ADMIN;
}
