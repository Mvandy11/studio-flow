/**
 * src/modules/memberships/index.ts
 *
 * Barrel re-export so that any file using:
 *   import { useMembership } from '../../modules/memberships'
 *   import { useMembership } from '../modules/memberships'
 * ...resolves correctly to the single fixed hook in src/hooks/useMembership.js
 */
export { useMembership } from '../../hooks/useMembership';
export { getMembership } from './getMembership';
export { requireMembership } from './requireMembership';
