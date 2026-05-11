/**
 * useAuth — thin re-export from AuthContext.
 * Auth state is now a single shared instance (AuthProvider at the app root).
 * All 32+ components that import this hook read from the same context.
 */
export { useAuth } from '../context/AuthContext';
