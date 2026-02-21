import { createClient } from "@/lib/supabase/server";

export async function getSubscription() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, subscription: null, isPro: false };
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isPro =
    subscription?.status === "active" || subscription?.status === "trialing";

  return { user, subscription, isPro };
}
