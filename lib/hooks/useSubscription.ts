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
        setSubscription(data);
        setLoading(false);
      });
  }, [user, userLoading]);

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

  return { user, subscription, isPro, loading: loading || userLoading, refresh };
}
