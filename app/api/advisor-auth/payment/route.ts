import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { getStripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/url";

const log = logger("advisor-payment");

const CREDIT_PACKS = {
  starter: { leads: 5, price_cents: 19900, label: "5 Leads" },
  growth: { leads: 12, price_cents: 44900, label: "12 Leads" },
  scale: { leads: 25, price_cents: 79900, label: "25 Leads" },
} as const;

type CreditPack = keyof typeof CREDIT_PACKS;

/**
 * POST /api/advisor-auth/payment
 * Creates a Stripe Checkout session for advisor credit top-up.
 * On webhook completion, credits are added to the advisor's credit_balance_cents.
 */
export async function POST(request: NextRequest) {
  try {
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let body: { credit_pack?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (
      !body.credit_pack ||
      !Object.keys(CREDIT_PACKS).includes(body.credit_pack as string)
    ) {
      return NextResponse.json(
        { error: `credit_pack must be one of: ${Object.keys(CREDIT_PACKS).join(", ")}.` },
        { status: 400 },
      );
    }

    const pack = CREDIT_PACKS[body.credit_pack as CreditPack];
    const admin = createAdminClient();

    const { data: advisor, error: advisorError } = await admin
      .from("professionals")
      .select("id, name, email, stripe_customer_id, status")
      .eq("id", advisorId)
      .single();

    if (advisorError || !advisor) {
      return NextResponse.json({ error: "Advisor not found." }, { status: 404 });
    }

    if (!["active", "pending"].includes(advisor.status)) {
      return NextResponse.json({ error: "Advisor account is not active." }, { status: 403 });
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch {
      return NextResponse.json(
        { error: "Payment system is not configured yet. Please contact support." },
        { status: 503 },
      );
    }

    let customerId = advisor.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: advisor.email,
        name: advisor.name,
        metadata: {
          professional_id: String(advisor.id),
          source: "invest_com_au_advisor",
        },
      });
      customerId = customer.id;

      await admin
        .from("professionals")
        .update({ stripe_customer_id: customerId })
        .eq("id", advisor.id);
    }

    const { data: topup } = await admin
      .from("advisor_credit_topups")
      .insert({
        professional_id: advisor.id,
        amount_cents: pack.price_cents,
        status: "pending",
      })
      .select("id")
      .single();

    const siteUrl = getSiteUrl();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: pack.price_cents,
            product_data: {
              name: `Invest.com.au Lead Credit — ${pack.label}`,
              description: `${pack.leads} exclusive advisor leads`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "advisor_credit_topup",
        advisor_id: String(advisorId),
        credit_pack: body.credit_pack as string,
        credits: String(pack.leads),
        topup_id: String(topup?.id || ""),
      },
      success_url: `${siteUrl}/advisor-portal?payment=success`,
      cancel_url: `${siteUrl}/advisor-portal?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error("Advisor payment error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 },
    );
  }
}
