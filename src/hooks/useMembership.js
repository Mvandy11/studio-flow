import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useMembership(user) {
  const [membership, setMembership] = useState({
    subscription_active: false,
    subscription_status: null,
    current_period_end: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    async function loadMembership() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("subscription_active, subscription_status, current_period_end")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (isMounted) {
          setMembership({
            subscription_active: data?.subscription_active ?? false,
            subscription_status: data?.subscription_status ?? null,
            current_period_end: data?.current_period_end ?? null,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (isMounted) {
          setMembership((prev) => ({
            ...prev,
            loading: false,
            error: err.message,
          }));
        }
      }
    }

    loadMembership();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return membership;
}
