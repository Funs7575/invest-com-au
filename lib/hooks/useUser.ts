"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// supabase.auth.getUser() has been observed to neither resolve nor reject
// when the auth service is unreachable (TLS / fetch deadlock at the edge).
// .catch() alone doesn't help — a promise that never settles never rejects,
// so `loading` would stay true and AccountButton + every downstream
// auth-gated UI stays pinned in its loading skeleton forever. Cap the
// initial call: well above typical ~200ms response, short enough that the
// user sees an actionable Sign In control rather than a stuck skeleton.
const INITIAL_GET_USER_TIMEOUT_MS = 5000;

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const fallbackTimer = setTimeout(() => {
      if (cancelled) return;
      // Treat as logged-out on timeout; onAuthStateChange below still
      // upgrades state if a real session resolves later.
      setUser(null);
      setLoading(false);
    }, INITIAL_GET_USER_TIMEOUT_MS);

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) return;
        clearTimeout(fallbackTimer);
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        clearTimeout(fallbackTimer);
        setUser(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
