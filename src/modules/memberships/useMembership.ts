import { useState, useEffect } from 'react';
import { getMembership } from './getMembership';
import { requireMembership } from './requireMembership';
import { useAuth } from '../../hooks/useAuth';
import type { Membership } from '../../lib/types';

export interface UseMembershipResult {
  membership: Membership | null;
  loading: boolean;
  error: string | null;
  /** True when the user has full access (admin, active membership, or subscription_active) */
  hasAccess: boolean;
}

export function useMembership(): UseMembershipResult {
  const { user, role } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setMembership(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getMembership(user.id)
      .then((m) => { if (!cancelled) setMembership(m); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [user?.id]);

  const hasAccess = requireMembership({
    role,
    membership,
    subscriptionActive: user?.profile?.subscription_active,
  });

  return { membership, loading, error, hasAccess };
}
