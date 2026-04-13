"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Get initial user.
    //
    // The previous version had no .catch() — if supabase.auth.getUser()
    // rejected (network failure, auth service down), `loading` would stay
    // true forever and every component downstream (AccountButton, shortlist,
    // compare CTAs, subscription checks) would sit in its loading skeleton
    // indefinitely. This blocked the whole authenticated UI on a single
    // transient failure.
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) return;
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Treat as logged-out rather than hanging the UI forever. The
        // onAuthStateChange subscription below will still upgrade state
        // if the user actually has a valid session once the service is
        // reachable again.
        setUser(null);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
