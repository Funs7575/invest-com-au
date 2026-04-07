import { getStripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/url";

const log = logger("stripe-contract");

const ADVISOR_PLANS = {
  basic: {
    name: "Basic",
    monthly: 9900, // $99 in cents
    annual: 99000, // $990 in cents
  },
  professional: {
    name: "Professional",
    monthly: 24900, // $249 in cents
    annual: 249000, // $2,490 in cents
  },
  premium: {
    name: "Premium",
    monthly: 49900, // $499 in cents
    annual: 499000, // $4,990 in cents
  },
} as const;

type PlanKey = keyof typeof ADVISOR_PLANS;
type BillingCycle = "monthly" | "annual";

export async function POST(request: NextRequest) {
  try {
    // Verify advisor session
    const sessionToken = request.cookies.get("advisor_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const adminDb = createAdminClient();
    const { data: advisorSession } = await adminDb
      .from("advisor_sessions")
      .select("professional_id, expires_at")
      .eq("session_token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single();
    if (!advisorSession) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const body = await request.json();
    const { advisor_id, plan, billing_cycle } = body as {
      advisor_id?: string;
      plan?: string;
      billing_cycle?: string;
    };

    if (!advisor_id || !plan || !billing_cycle) {
      return NextResponse.json(
        { error: "Missing required fields: advisor_id, plan, billing_cycle" },
        { status: 400 }
      );
    }

    if (!["basic", "professional", "premium"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be basic, professional, or premium." },
        { status: 400 }
      );
    }

    if (!["monthly", "annual"].includes(billing_cycle)) {
      return NextResponse.json(
        { error: "Invalid billing_cycle. Must be monthly or annual." },
        { status: 400 }
      );
    }

    // Verify caller owns this advisor_id
    if (String(advisorSession.professional_id) !== String(advisor_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const planKey = plan as PlanKey;
    const cycle = billing_cycle as BillingCycle;
    const planConfig = ADVISOR_PLANS[planKey];
    const unitAmount = cycle === "annual" ? planConfig.annual : planConfig.monthly;
    const interval = cycle === "annual" ? "year" : "month";

    const siteUrl = getSiteUrl();
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: `Advisor ${planConfig.name} Plan`,
              description: `${planConfig.name} advisor subscription — billed ${cycle === "annual" ? "annually" : "monthly"}`,
            },
            unit_amount: unitAmount,
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      metadata: {
        advisor_id,
        plan: planKey,
        billing_cycle: cycle,
      },
      success_url: `${siteUrl}/for-advisors/pricing?checkout=success`,
      cancel_url: `${siteUrl}/for-advisors/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error("Create contract checkout error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
