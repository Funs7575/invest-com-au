import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/url";
import { DEFAULT_TOPUP_CENTS } from "@/lib/advisor-billing";
import { isRateLimited } from "@/lib/rate-limit";

async function getAdvisorId(request: NextRequest): Promise<number | null> {
  const supabase = await createClient();
  const admin = createAdminClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: advisor } = await admin
      .from("professionals")
      .select("id")
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
      .in("status", ["active", "pending"])
      .maybeSingle();
    if (advisor) return advisor.id;
  }
  
  const sessionToken = request.cookies.get("advisor_session")?.value;
  if (!sessionToken) return null;
  const { data } = await admin
    .from("advisor_sessions")
    .select("professional_id, expires_at")
    .eq("session_token", sessionToken)
    .single();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return data.professional_id;
}

/**
 * POST /api/advisor-auth/topup
 * Creates a Stripe Checkout session for advisor credit top-up.
 * Default: A$200 top-up.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`topup:${ip}`, 5, 60)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const advisorId = await getAdvisorId(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const packSlug = body.pack_slug as string | undefined;
  
  // Pack pricing (must match credit_packs table)
  const PACKS: Record<string, { leads: number; price_cents: number; per_lead_cents: number }> = {
    starter: { leads: 5, price_cents: 19900, per_lead_cents: 3980 },
    growth: { leads: 12, price_cents: 44900, per_lead_cents: 3742 },
    scale: { leads: 25, price_cents: 79900, per_lead_cents: 3196 },
    featured_monthly: { leads: 0, price_cents: 14900, per_lead_cents: 0 },
    expert_article: { leads: 0, price_cents: 29900, per_lead_cents: 0 },
  };
  
  const pack = packSlug ? PACKS[packSlug] : null;
  const amountCents = pack ? pack.price_cents : (body.amount_cents || DEFAULT_TOPUP_CENTS);

  // Validate amount (min $50, max $2000)
  if (amountCents < 5000 || amountCents > 200000) {
    return NextResponse.json({ error: "Top-up amount must be between $50 and $2,000" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: pro } = await supabase
    .from("professionals")
    .select("id, name, email, stripe_customer_id")
    .eq("id", advisorId)
    .single();

  if (!pro) return NextResponse.json({ error: "Professional not found" }, { status: 404 });

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: "Payment system is not configured yet. Please contact support." }, { status: 503 });
  }
  const siteUrl = getSiteUrl();

  // Get or create Stripe customer
  let customerId = pro.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: pro.email,
      name: pro.name,
      metadata: { professional_id: String(pro.id), source: "invest_com_au_advisor" },
    });
    customerId = customer.id;
    await supabase.from("professionals").update({ stripe_customer_id: customerId }).eq("id", pro.id);
  }

  // Create a pending top-up record
  const { data: topup } = await supabase
    .from("advisor_credit_topups")
    .insert({
      professional_id: pro.id,
      amount_cents: amountCents,
      status: "pending",
    })
    .select("id")
    .single();

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "aud",
        unit_amount: amountCents,
        product_data: {
          name: packSlug === "featured_monthly" ? "Featured Advisor — 1 Month"
            : packSlug === "expert_article" ? "Expert Article Publication"
            : `Invest.com.au Lead Credit — ${pack?.leads || "Custom"} Leads`,
          description: packSlug === "featured_monthly" ? "Priority listing, featured badge, and gold border for 30 days"
            : packSlug === "expert_article" ? "SEO-optimised expert article published on invest.com.au"
            : `A$${(amountCents / 100).toFixed(0)} credit for exclusive advisor leads`,
        },
      },
      quantity: 1,
    }],
    metadata: {
      professional_id: String(pro.id),
      topup_id: String(topup?.id || ""),
      type: packSlug === "featured_monthly" ? "advisor_featured" : packSlug === "expert_article" ? "advisor_article" : "advisor_credit_topup",
      pack_slug: packSlug || "custom",
      pack_leads: pack ? String(pack.leads) : "",
      per_lead_cents: pack ? String(pack.per_lead_cents) : "",
    },
    success_url: `${siteUrl}/advisor-portal?topup=success`,
    cancel_url: `${siteUrl}/advisor-portal?topup=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}

/**
 * GET /api/advisor-auth/topup
 * Returns the advisor's current credit balance and top-up history.
 */
export async function GET(request: NextRequest) {
  const advisorId = await getAdvisorId(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = createAdminClient();

  const [{ data: pro }, { data: topups }] = await Promise.all([
    supabase
      .from("professionals")
      .select("credit_balance_cents, lifetime_credit_cents, lifetime_lead_spend_cents, free_leads_used, lead_price_cents")
      .eq("id", advisorId)
      .single(),
    supabase
      .from("advisor_credit_topups")
      .select("id, amount_cents, status, created_at")
      .eq("professional_id", advisorId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    balance_cents: pro?.credit_balance_cents || 0,
    lifetime_credit_cents: pro?.lifetime_credit_cents || 0,
    lifetime_spend_cents: pro?.lifetime_lead_spend_cents || 0,
    free_leads_used: pro?.free_leads_used || 0,
    free_leads_remaining: Math.max(0, 2 - (pro?.free_leads_used || 0)),
    lead_price_cents: pro?.lead_price_cents || 4900,
    topups: topups || [],
  });
}
