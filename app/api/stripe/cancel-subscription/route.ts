import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger("stripe");

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

    // Immediately reflect the cancellation in Supabase so the account page
    // updates without waiting for the webhook round-trip. The webhook
    // (customer.subscription.updated) will fire shortly after and upsert
    // the same value — upserts are idempotent, so this is safe.
    await admin
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", sub.stripe_subscription_id);

    return NextResponse.json({ success: true, cancel_at_period_end: true });
  } catch (err) {
    log.error("Cancel subscription error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
