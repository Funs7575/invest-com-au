import { getStripe, PLANS } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/url";

const log = logger("stripe");

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse plan from body
    const body = await request.json();
    const validPlans = ["monthly", "yearly", "international_standard", "international_premium"] as const;
    type ValidPlan = (typeof validPlans)[number];
    const planKey: ValidPlan = validPlans.includes(body.plan) ? body.plan : "monthly";
    const planConfig = PLANS[planKey];

    if (!planConfig.priceId) {
      return NextResponse.json(
        { error: "Plan not configured" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      if (!user.email) {
        return NextResponse.json(
          { error: "Email address is required for checkout" },
          { status: 400 }
        );
      }

      // Rapid double-click race handling. Two parallel requests can both
      // see `customerId=null`. Stripe's idempotency key on customers.create
      // ensures they resolve to the *same* Stripe customer, but the
      // problem is both requests then create checkout sessions. Persist
      // the customer first, then re-read the profile row under the race
      // window — if the other request wrote first, reuse their customer.
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      }, {
        idempotencyKey: `customer_${user.id}`,
      });

      await admin
        .from("profiles")
        .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .is("stripe_customer_id", null);  // only write if still null

      // Re-read so we converge on whichever customer id actually won
      // the race — both sides will see the same row after this fetch.
      const { data: refreshed } = await admin
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single();
      customerId = refreshed?.stripe_customer_id || customer.id;
    }

    // Check for existing active subscription. Also exclude cancel_at_period_end
    // subscriptions that are actively cancelling — users mid-cancel who want
    // to resubscribe should be allowed through the checkout without the
    // "already have an active subscription" wall.
    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("id, cancel_at_period_end")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .limit(1)
      .maybeSingle();

    if (existingSub && !existingSub.cancel_at_period_end) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    // Create Checkout Session.
    //
    // Idempotency: previous key embedded Date.now() which made it a no-op
    // (every request was unique). Use a 10-minute bucket so rapid repeat
    // clicks from the same user+plan converge on the same session while
    // still letting a deliberate retry after a cancelled checkout get a
    // fresh URL.
    const siteUrl = getSiteUrl();
    const bucket = Math.floor(Date.now() / (10 * 60 * 1000));

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${siteUrl}/account?checkout=success`,
      cancel_url: `${siteUrl}/pro?checkout=cancelled`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      allow_promotion_codes: true,
    }, {
      idempotencyKey: `checkout_${user.id}_${planKey}_${bucket}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error("Create checkout error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
