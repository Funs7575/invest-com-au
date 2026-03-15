import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { extractUtm, type UtmParams } from "@/lib/utm";

export const runtime = "edge";

const log = logger("submit-lead");

/**
 * POST /api/submit-lead
 *
 * Writes a lead to the `leads` table with full attribution.
 * Called from:
 *   - Advisor quiz completion (lead_type: 'advisor')
 *   - Platform CTA clicks with contact capture (lead_type: 'platform')
 *
 * Body:
 *   lead_type: 'advisor' | 'platform'
 *   user_email: string
 *   user_name?: string
 *   user_phone?: string
 *   user_location_state?: string
 *   user_intent?: object (quiz responses)
 *   professional_id?: number  (advisor leads)
 *   broker_slug?: string      (platform leads)
 *   source_page?: string
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    lead_type,
    user_email,
    user_name,
    user_phone,
    user_location_state,
    user_intent,
    professional_id,
    broker_slug,
    source_page,
  } = body as {
    lead_type?: string;
    user_email?: string;
    user_name?: string;
    user_phone?: string;
    user_location_state?: string;
    user_intent?: Record<string, unknown>;
    professional_id?: number;
    broker_slug?: string;
    source_page?: string;
  };

  if (!lead_type || !["advisor", "platform"].includes(lead_type)) {
    return NextResponse.json({ error: "Invalid lead_type" }, { status: 400 });
  }

  if (!isValidEmail(user_email as string)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Rate limit
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  if (await isRateLimited(`submit-lead:${ip}`, 10, 5)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const utm = extractUtm(body);
  const supabase = createAdminClient();

  // Resolve broker_id if platform lead
  let broker_id: number | null = null;
  if (lead_type === "platform" && broker_slug) {
    const { data: broker } = await supabase
      .from("brokers")
      .select("id, cpa_value")
      .eq("slug", broker_slug)
      .single();
    if (broker) {
      broker_id = broker.id;
    }
  }

  // Get advisor lead fee from tier
  let revenue_value_cents = 0;
  if (lead_type === "advisor" && professional_id) {
    const { data: advisor } = await supabase
      .from("professionals")
      .select("advisor_tier")
      .eq("id", professional_id)
      .single();

    if (advisor) {
      const tierFees: Record<string, number> = {
        gold: 6000,
        silver: 8000,
        bronze: 10000,
      };
      revenue_value_cents = tierFees[advisor.advisor_tier || "bronze"] ?? 10000;
    }
  }

  // Insert lead
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      lead_type,
      professional_id: professional_id ?? null,
      broker_id,
      user_email: (user_email as string).toLowerCase().trim(),
      user_name: (typeof user_name === "string" ? user_name.trim() : null) ?? null,
      user_phone: (typeof user_phone === "string" ? user_phone.trim() : null) ?? null,
      user_location_state: (typeof user_location_state === "string" ? user_location_state : null) ?? null,
      user_intent: user_intent ?? null,
      revenue_value_cents,
      source_page: (typeof source_page === "string" ? source_page : null) ?? null,
      utm_source: (utm as UtmParams).utm_source ?? null,
      utm_medium: (utm as UtmParams).utm_medium ?? null,
      utm_campaign: (utm as UtmParams).utm_campaign ?? null,
      status: "sent",
    })
    .select("id")
    .single();

  if (error) {
    log.error("Lead insert failed", { error: error.message });
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }

  // Update advisor last_lead_date (non-fatal)
  if (lead_type === "advisor" && professional_id) {
    supabase
      .from("professionals")
      .update({ last_lead_date: new Date().toISOString() })
      .eq("id", professional_id)
      .then(() => null, () => null);
  }

  log.info("Lead submitted", { lead_id: lead?.id, lead_type });

  return NextResponse.json({ success: true, lead_id: lead?.id });
}
