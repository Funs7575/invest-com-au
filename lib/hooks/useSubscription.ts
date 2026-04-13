"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";

interface Subscription {
  id: number;
  status: string;
  plan_interval: string | null;
  price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
}

export function useSubscription() {
  const { user, loading: userLoading } = useUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const isPro =
    subscription?.status === "active" || subscription?.status === "trialing";

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    // Cancellation flag — stops stale setState calls if the user logs
    // out (or rapidly switches users) before the async Supabase query
    // resolves. Without this, a pending query could overwrite the state
    // of a fresh user mount with the previous user's subscription data.
    let cancelled = false;

    const supabase = createClient();
    supabase
      .from("subscriptions")
      .select(
        "id, status, plan_interval, price_id, current_period_start, current_period_end, cancel_at_period_end, canceled_at, created_at"
      )
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setSubscription(data);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  // Apply an optimistic change locally without refetching. Used by the
  // account page so the UI reflects "Cancelling" immediately after the
  // cancel API succeeds, instead of waiting 1.5–4s for the refresh poll.
  const optimisticUpdate = (patch: Partial<Subscription>) => {
    setSubscription((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  // Refresh subscription data (useful after checkout)
  const refresh = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("subscriptions")
      .select(
        "id, status, plan_interval, price_id, current_period_start, current_period_end, cancel_at_period_end, canceled_at, created_at"
      )
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(data);
  };

  return { user, subscription, isPro, loading: loading || userLoading, refresh, optimisticUpdate };
}
