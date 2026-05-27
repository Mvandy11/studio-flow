/**
 * src/modules/memberships/useMembership.ts
 *
 * Re-export shim — resolves all direct-path imports of the form:
 *   import { useMembership } from '../../modules/memberships/useMembership'
 *   import { useMembership } from '../modules/memberships/useMembership'
 *
 * The real implementation lives in src/hooks/useMembership.js
 */
export { useMembership } from '../../hooks/useMembership';
