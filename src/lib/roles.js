/**
 * Studio Flow role constants.
 *
 * Roles (least → most privileged):
 *   user           — standard authenticated user
 *   creator        — content owner (owns sessions / events)
 *   admin          — super-user alias (DB value: 'admin')
 *   creator_admin  — super-user legacy alias (DB value: 'creator_admin')
 *
 * Both 'admin' and 'creator_admin' grant identical full access.
 * isCreatorAdmin() accepts either string so the UI works regardless of
 * which value Supabase returns.
 */
export const ROLES = {
  USER:          'user',
  CREATOR:       'creator',
  ADMIN:         'admin',          // canonical DB value going forward
  CREATOR_ADMIN: 'creator_admin',  // legacy alias — kept for back-compat
};

/** Returns true when the role has full admin / super-user privileges.
 *  Accepts both 'admin' and the legacy 'creator_admin'. */
export function isCreatorAdmin(role) {
  return role === ROLES.ADMIN || role === ROLES.CREATOR_ADMIN;
}

/**
 * Returns true when the user has at least creator-level privileges.
 * Both admin aliases always pass this check.
 */
export function isCreatorOrAdmin(role) {
  return (
    role === ROLES.CREATOR ||
    role === ROLES.ADMIN ||
    role === ROLES.CREATOR_ADMIN
  );
}
