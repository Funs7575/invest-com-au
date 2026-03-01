import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Look up active subscription
    const admin = createAdminClient();
    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id, status, cancel_at_period_end")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    if (sub.cancel_at_period_end) {
      return NextResponse.json(
        { error: "Subscription is already set to cancel" },
        { status: 400 }
      );
    }

    // Cancel at period end via Stripe
    await getStripe().subscriptions.update(
      sub.stripe_subscription_id,
      { cancel_at_period_end: true },
      { idempotencyKey: `cancel_${sub.stripe_subscription_id}_${Date.now()}` }
    );

    // Webhook (customer.subscription.updated) will sync cancel_at_period_end
    // to Supabase via upsertSubscription() automatically.

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
