import { createClient } from "@/lib/supabase/server";

export type SubscriptionResult = Awaited<ReturnType<typeof getSubscription>>;

export async function getSubscription() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, subscription: null, isPro: false } as const;
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

// Soft-gating helper for server components.
//
// Returns `{ isPro, user, subscription }` — never redirects, never throws.
// The caller decides what to do with non-Pro: render an upgrade CTA,
// strip paid fields out of the props handed to the client, etc.
//
// Why soft-gating, not redirect-on-non-Pro: long-form reports and
// newsletter editions need to render the *free preview* for SEO and
// for visitors deciding whether to upgrade. A hard redirect would
// destroy that funnel.
export async function requirePro(): Promise<SubscriptionResult> {
  return getSubscription();
}

// Strip premium fields from server-fetched data when the viewer is not
// Pro. Pass the full record + the list of fields to blank out and the
// fallback values to substitute. This is the single canonical pattern
// for server-side gating so view-source can't leak paid fields.
//
// Example:
//   const safeReport = gatePremiumData(report, isPro, {
//     sections: [],
//     fee_changes_summary: [],
//     new_entrants: [],
//   });
export function gatePremiumData<T extends object, K extends keyof T>(
  data: T,
  isPro: boolean,
  fallbacks: { [P in K]: T[P] },
): T {
  if (isPro) return data;
  return { ...data, ...fallbacks };
}
