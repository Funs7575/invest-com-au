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

    // Get Stripe customer ID
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found" },
        { status: 404 }
      );
    }

    // Create portal session
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";

    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/account`,
    }, {
      idempotencyKey: `portal_${user.id}_${Date.now()}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error("Create portal error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
