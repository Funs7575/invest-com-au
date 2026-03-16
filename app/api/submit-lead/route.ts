import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { extractUtm, type UtmParams } from "@/lib/utm";
import { sendNewLeadNotification, sendLeadConfirmationToUser } from "@/lib/advisor-emails";

export const runtime = "edge";

const log = logger("submit-lead");

/* ─── Intent → advisor type mapping ─── */

const INTENT_TYPE_MAP: Record<string, string[]> = {
  mortgage: ["mortgage_broker"],
  buyers: ["buyers_agent"],
  insurance: ["insurance_broker"],
  planning: ["financial_planner", "wealth_manager"],
  tax: ["tax_agent"],
  wealth: ["wealth_manager", "financial_planner"],
  smsf: ["smsf_accountant"],
  estate: ["estate_planner"],
  agedcare: ["aged_care_advisor"],
  property: ["property_advisor", "buyers_agent"],
  crypto: ["crypto_advisor", "financial_planner"],
};

/* ─── Context-aware type refinement ─── */

function resolveAdvisorTypes(need: string, context?: string[]): string[] {
  const baseTypes = INTENT_TYPE_MAP[need] || ["financial_planner"];

  if (!context || context.length === 0) return baseTypes;

  const types = new Set(baseTypes);

  // Add more specific types based on context selections
  for (const c of context) {
    if (c === "first_home" || c === "refinance") types.add("mortgage_broker");
    if (c === "investment") { types.add("mortgage_broker"); types.add("property_advisor"); }
    if (c === "buyers_agent") types.add("buyers_agent");
    if (c === "life_insurance" || c === "income_protection") types.add("insurance_broker");
    if (c === "estate_planning") types.add("estate_planner");
    if (c === "aged_care") types.add("aged_care_advisor");
    if (c === "smsf_setup" || c === "smsf_manage") types.add("smsf_accountant");
    if (c === "tax_optimization") types.add("tax_agent");
    if (c === "crypto_tax") { types.add("crypto_advisor"); types.add("tax_agent"); }
    if (c === "retirement") types.add("financial_planner");
  }

  return [...types];
}

/**
 * POST /api/submit-lead
 *
 * Auto-matches the user with the best available advisor based on:
 *   1. Advisor type (mapped from quiz intent + context)
 *   2. Location (user's state)
 *   3. Rating & reviews (highest first)
 *   4. Round-robin fairness (skip advisors who got a lead in the last 24h)
 *
 * Returns matched advisor profile for immediate display.
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
    user_intent?: { need?: string; context?: string[]; budget?: string };
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

  // ─── Platform leads (unchanged) ───
  if (lead_type === "platform") {
    let broker_id: number | null = null;
    if (broker_slug) {
      const { data: broker } = await supabase
        .from("brokers")
        .select("id, cpa_value")
        .eq("slug", broker_slug)
        .single();
      if (broker) broker_id = broker.id;
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        lead_type,
        broker_id,
        user_email: (user_email as string).toLowerCase().trim(),
        user_name: typeof user_name === "string" ? user_name.trim() : null,
        user_phone: typeof user_phone === "string" ? user_phone.trim() : null,
        source_page: typeof source_page === "string" ? source_page : null,
        utm_source: (utm as UtmParams).utm_source ?? null,
        utm_medium: (utm as UtmParams).utm_medium ?? null,
        utm_campaign: (utm as UtmParams).utm_campaign ?? null,
        status: "sent",
      })
      .select("id")
      .single();

    if (error) {
      log.error("Platform lead insert failed", { error: error.message });
      return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead_id: lead?.id });
  }

  // ─── Advisor leads: auto-match ───

  const need = user_intent?.need || "planning";
  const context = user_intent?.context || [];
  const advisorTypes = resolveAdvisorTypes(need, context);
  const userState = typeof user_location_state === "string" ? user_location_state : null;

  // 24h ago for round-robin fairness
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Try matching: same state, no recent lead, best rated
  let matchedAdvisor: Record<string, unknown> | null = null;

  // Attempt 1: Same state + not recently matched
  if (userState) {
    const { data } = await supabase
      .from("professionals")
      .select("id, slug, name, firm_name, type, photo_url, rating, review_count, location_display, location_state, specialties, fee_description, verified, bio, email")
      .eq("status", "active")
      .eq("verified", true)
      .eq("location_state", userState)
      .in("type", advisorTypes)
      .or(`last_lead_date.is.null,last_lead_date.lt.${oneDayAgo}`)
      .order("rating", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(1);

    if (data && data.length > 0) matchedAdvisor = data[0];
  }

  // Attempt 2: Same state, any advisor (ignore round-robin)
  if (!matchedAdvisor && userState) {
    const { data } = await supabase
      .from("professionals")
      .select("id, slug, name, firm_name, type, photo_url, rating, review_count, location_display, location_state, specialties, fee_description, verified, bio, email")
      .eq("status", "active")
      .eq("verified", true)
      .eq("location_state", userState)
      .in("type", advisorTypes)
      .order("rating", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(1);

    if (data && data.length > 0) matchedAdvisor = data[0];
  }

  // Attempt 3: Any state, best available
  if (!matchedAdvisor) {
    const { data } = await supabase
      .from("professionals")
      .select("id, slug, name, firm_name, type, photo_url, rating, review_count, location_display, location_state, specialties, fee_description, verified, bio, email")
      .eq("status", "active")
      .eq("verified", true)
      .in("type", advisorTypes)
      .order("rating", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(1);

    if (data && data.length > 0) matchedAdvisor = data[0];
  }

  // Attempt 4: Absolute fallback — any advisor
  if (!matchedAdvisor) {
    const { data } = await supabase
      .from("professionals")
      .select("id, slug, name, firm_name, type, photo_url, rating, review_count, location_display, location_state, specialties, fee_description, verified, bio, email")
      .eq("status", "active")
      .eq("verified", true)
      .order("rating", { ascending: false })
      .limit(1);

    if (data && data.length > 0) matchedAdvisor = data[0];
  }

  const matchedId = matchedAdvisor ? (matchedAdvisor.id as number) : null;

  // Get advisor lead fee from tier
  let revenue_value_cents = 0;
  const resolvedProfessionalId = professional_id ?? matchedId;
  if (resolvedProfessionalId) {
    const { data: advisor } = await supabase
      .from("professionals")
      .select("advisor_tier")
      .eq("id", resolvedProfessionalId)
      .single();

    if (advisor) {
      const tierFees: Record<string, number> = { gold: 6000, silver: 8000, bronze: 10000 };
      revenue_value_cents = tierFees[(advisor.advisor_tier as string) || "bronze"] ?? 10000;
    }
  }

  // Insert into unified leads table
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      lead_type,
      professional_id: resolvedProfessionalId,
      user_email: (user_email as string).toLowerCase().trim(),
      user_name: typeof user_name === "string" ? user_name.trim() : null,
      user_phone: typeof user_phone === "string" ? user_phone.trim() : null,
      user_location_state: userState,
      user_intent: user_intent ?? null,
      revenue_value_cents,
      source_page: typeof source_page === "string" ? source_page : null,
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

  // Also insert into professional_leads for the advisor's dashboard
  if (resolvedProfessionalId) {
    supabase
      .from("professional_leads")
      .insert({
        professional_id: resolvedProfessionalId,
        user_name: typeof user_name === "string" ? user_name.trim() : null,
        user_email: (user_email as string).toLowerCase().trim(),
        user_phone: typeof user_phone === "string" ? user_phone.trim() : null,
        message: `Auto-matched via quiz. Need: ${need}. Context: ${(context || []).join(", ")}. Budget: ${user_intent?.budget || "not specified"}.`,
        source_page: typeof source_page === "string" ? source_page : null,
        utm_source: (utm as UtmParams).utm_source ?? null,
        utm_medium: (utm as UtmParams).utm_medium ?? null,
        utm_campaign: (utm as UtmParams).utm_campaign ?? null,
        status: "new",
      })
      .then(() => null, () => null);

    // Update advisor's last_lead_date for round-robin
    supabase
      .from("professionals")
      .update({ last_lead_date: new Date().toISOString() })
      .eq("id", resolvedProfessionalId)
      .then(() => null, () => null);
  }

  // Send email notifications (non-blocking)
  if (matchedAdvisor && matchedAdvisor.email) {
    // Notify the advisor
    sendNewLeadNotification(
      matchedAdvisor.email as string,
      matchedAdvisor.name as string,
      typeof user_name === "string" ? user_name.trim() : "A potential client",
      (user_email as string).toLowerCase().trim(),
      typeof user_phone === "string" ? user_phone.trim() : null,
      userState,
      need,
      context,
    ).catch(() => null);

    // Confirm to the user
    sendLeadConfirmationToUser(
      (user_email as string).toLowerCase().trim(),
      typeof user_name === "string" ? user_name.trim() : "there",
      matchedAdvisor.name as string,
      matchedAdvisor.type as string,
      (matchedAdvisor.firm_name as string) || null,
    ).catch(() => null);
  }

  log.info("Lead submitted with match", {
    lead_id: lead?.id,
    matched_advisor_id: matchedId,
    advisor_types: advisorTypes,
    state: userState,
  });

  return NextResponse.json({
    success: true,
    lead_id: lead?.id,
    matched: matchedAdvisor
      ? {
          slug: matchedAdvisor.slug,
          name: matchedAdvisor.name,
          firm_name: matchedAdvisor.firm_name || null,
          type: matchedAdvisor.type,
          photo_url: matchedAdvisor.photo_url || null,
          rating: matchedAdvisor.rating,
          review_count: matchedAdvisor.review_count,
          location_display: matchedAdvisor.location_display || null,
          specialties: matchedAdvisor.specialties || [],
          fee_description: matchedAdvisor.fee_description || null,
          verified: matchedAdvisor.verified || false,
        }
      : null,
  });
}
