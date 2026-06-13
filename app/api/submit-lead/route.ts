import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { extractUtm, type UtmParams } from "@/lib/utm";
import { sendNewLeadNotification, sendLeadConfirmationToUser } from "@/lib/advisor-emails";
import { captureEdgeEvent } from "@/lib/posthog/capture-edge";
import { getIntentCountry } from "@/lib/intent-context-server";
import { intentCountryMeta } from "@/lib/intent-context";
import {
  filterByCountryEligibility,
  isEligibleForCountry,
  type EntityWithEligibility,
} from "@/lib/country-mode/eligibility-filter";

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
  // CR-04a grants marketplace: grant specialists first, tax agents as the
  // real-supply fallback (they do R&DTI work today).
  grants: ["grant_writer", "tax_agent"],
};

/* ─── Context-aware type refinement ─── */

function resolveAdvisorTypes(need: string, context?: string[]): string[] {
  const baseTypes = INTENT_TYPE_MAP[need] || ["financial_planner"];

  if (!context || context.length === 0) return baseTypes;

  const types = new Set(baseTypes);

  for (const c of context) {
    if (c === "first_home" || c === "refinance") types.add("mortgage_broker");
    if (c === "investment") { types.add("mortgage_broker"); types.add("property_advisor"); }
    if (c === "buyers_agent") types.add("buyers_agent");
    if (c === "life_insurance" || c === "income_protection") types.add("insurance_broker");
    if (c === "estate_planning") types.add("estate_planner");
    if (c === "aged_care") types.add("aged_care_advisor");
    if (c === "smsf_setup" || c === "smsf_manage") types.add("smsf_accountant");
    if (c === "tax_optimization") types.add("tax_agent");
    if (c === "grant_funding") { types.add("grant_writer"); types.add("tax_agent"); }
    if (c === "crypto_tax") { types.add("crypto_advisor"); types.add("tax_agent"); }
    if (c === "retirement") types.add("financial_planner");
    // Commercial property buyers need finance + acquisition help, same as
    // residential investors — there is no dedicated commercial type.
    if (c === "commercial") { types.add("mortgage_broker"); types.add("buyers_agent"); }
    // "I'm not sure" under Tax & SMSF shouldn't lock the user to an SMSF
    // accountant — broaden to a tax agent who can triage the situation.
    if (c === "not_sure" && need === "smsf") types.add("tax_agent");
  }

  return [...types];
}

/* ─── Common select fields for matching queries ─── */

const MATCH_SELECT = "id, slug, name, firm_name, type, photo_url, rating, review_count, location_display, location_state, specialties, fee_description, verified, bio, email, avg_response_minutes, country_eligibility, available_in_countries";

/**
 * Per-attempt fetch limit when matching. Each ranked query pulls
 * `MATCH_FETCH_LIMIT` candidates so post-fetch country-eligibility
 * filtering (PR #619 / Phase 4) can skip ineligible top picks
 * without losing the cascading fallback.
 */
const MATCH_FETCH_LIMIT = 20;

/**
 * POST /api/submit-lead
 *
 * Auto-matches the user with the best available advisor based on:
 *   1. Advisor type (mapped from quiz intent + context)
 *   2. Location (user's state)
 *   3. Rating & reviews (highest first)
 *   4. Round-robin fairness (skip advisors who got a lead in the last 24h)
 *   5. Exclusion list (skip advisors the user was already matched with)
 *
 * Supports `exclude_advisor_ids` to avoid re-matching the same advisor.
 * Supports `rematch: true` to request a different advisor (skips lead creation emails on rematch).
 *
 * Returns matched advisor profile for immediate display.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    // eslint-disable-next-line invest/no-unvalidated-req-json -- full Zod migration tracked as E-04 batch 4
    body = await request.json();
  } catch (err) {
    log.warn("submit-lead invalid JSON", { err: err instanceof Error ? err.message : String(err) });
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
    exclude_advisor_ids,
    rematch,
    prev_lead_ids,
    dry_run,
    confirm_advisor_id,
    sms_consent,
    preferred_specialty,
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
    exclude_advisor_ids?: number[];
    rematch?: boolean;
    prev_lead_ids?: number[];
    /** If true: run matching logic and return advisor, but skip all DB writes and emails */
    dry_run?: boolean;
    /** If set: skip matching, create lead directly for this advisor ID */
    confirm_advisor_id?: number;
    /**
     * Spam Act 2003 s.16: user explicitly opted in to SMS/WhatsApp contact.
     * Stored on the lead so advisors have a legal signal before using
     * user_phone for outbound SMS or WhatsApp messages.
     */
    sms_consent?: boolean;
    /**
     * Cross-border Phase A: when the user arrives from a country page
     * (/foreign-investment/uk → ?specialty=UK+Pension+Transfer), prefer
     * advisors whose `specialties` array contains this exact string.
     * Falls back to the top-ranked non-specialist if no match is found
     * in the fetched batch — the corridor still gets routed, just to
     * the next-best advisor by the existing rank.
     */
    preferred_specialty?: string;
  };

  if (!lead_type || !["advisor", "platform"].includes(lead_type)) {
    return NextResponse.json({ error: "Invalid lead_type" }, { status: 400 });
  }

  // Honeypot: bots fill hidden fields that real users never see
  if (body.website || body.fax || body.company_url) {
    return NextResponse.json({ success: true, lead_id: null, matched: null });
  }

  // Email is required for anything side-effecting. A dry_run creates no lead
  // and sends nothing, so it may run WITHOUT contact details — this is what
  // lets /find-advisor show the match preview BEFORE the contact+OTP step
  // (§5.6: the wall used to tax users before they'd seen any value, while
  // guarding nothing). When an email IS provided on a dry run it must still
  // be well-formed, and the non-dry-run path is unchanged.
  if (!dry_run && (!user_email || !isValidEmail(user_email as string))) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (dry_run && user_email && !isValidEmail(user_email as string)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Reject disposable/throwaway email domains — advisors pay per lead
  if (user_email && isDisposableEmail(user_email as string)) {
    return NextResponse.json({ error: "Please use a real email address." }, { status: 400 });
  }

  // Rate limit
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  if (await isRateLimited(`submit-lead:${ip}`, 10, 5)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const utm = extractUtm(body);
  const supabase = createAdminClient();
  // Empty on a contact-less dry run; every email-keyed read below is guarded.
  const normalizedEmail = typeof user_email === "string" ? user_email.toLowerCase().trim() : "";

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
        user_email: normalizedEmail,
        user_name: typeof user_name === "string" ? user_name.trim() : null,
        user_phone: typeof user_phone === "string" ? user_phone.trim() : null,
        sms_consent: sms_consent === true,
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

    const pid = typeof (body as Record<string, unknown>).distinct_id === "string"
      ? (body as Record<string, unknown>).distinct_id as string
      : `anon-${crypto.randomUUID()}`;
    captureEdgeEvent(pid, "lead_submitted", {
      lead_source: "platform",
      source_page: typeof source_page === "string" ? source_page : null,
      advisor_match_count: 0,
      quiz_completed: false,
      utm_source: (utm as UtmParams).utm_source ?? null,
      utm_campaign: (utm as UtmParams).utm_campaign ?? null,
    });

    return NextResponse.json({ success: true, lead_id: lead?.id });
  }

  // ─── Advisor leads: auto-match ───

  const need = user_intent?.need || "planning";
  const context = user_intent?.context || [];
  const advisorTypes = resolveAdvisorTypes(need, context);
  const userState = typeof user_location_state === "string" ? user_location_state : null;

  // Visitor's resolved intent country (from iv_intent_country cookie).
  // Used to filter advisors whose country_eligibility excludes the
  // visitor — see filterByCountryEligibility for decision rules.
  const intentCountry = await getIntentCountry();

  // ─── confirm_advisor_id fast-path ───
  // User already previewed an advisor and clicked "Connect" — skip matching,
  // fetch that specific advisor and proceed straight to lead creation.
  if (confirm_advisor_id) {
    const { data: confirmedAdvisor } = await supabase
      .from("professionals")
      .select(MATCH_SELECT)
      .eq("id", confirm_advisor_id)
      .eq("status", "active")
      .single();

    if (!confirmedAdvisor) {
      return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
    }

    // Country-eligibility gate: if the user's intent country is in the
    // advisor's blocked_countries, refuse the confirm (an advisor that
    // doesn't serve UK residents shouldn't get a UK lead even if the
    // user manually clicked Connect on a stale matched-list entry).
    if (!isEligibleForCountry(confirmedAdvisor as EntityWithEligibility, intentCountry)) {
      log.info("Confirm blocked by country eligibility", {
        advisor_id: confirm_advisor_id,
        intent_country: intentCountry,
      });
      return NextResponse.json(
        { error: "This advisor isn't available for your country.", reason: "country_ineligible" },
        { status: 409 },
      );
    }

    // Dedup: prevent double-lead if user clicks "Connect" twice (network retry / double-click)
    const sevenDaysAgoConfirm = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("user_email", normalizedEmail)
      .eq("professional_id", confirm_advisor_id)
      .eq("lead_type", "advisor")
      .gte("created_at", sevenDaysAgoConfirm)
      .limit(1)
      .single();

    if (existingLead) {
      log.info("Duplicate confirm suppressed", { lead_id: existingLead.id, advisor_id: confirm_advisor_id });
      return NextResponse.json({
        success: true,
        lead_id: existingLead.id,
        matched: {
          id: confirmedAdvisor.id,
          slug: confirmedAdvisor.slug,
          name: confirmedAdvisor.name,
          firm_name: confirmedAdvisor.firm_name,
          type: confirmedAdvisor.type,
          photo_url: confirmedAdvisor.photo_url,
          rating: confirmedAdvisor.rating,
          review_count: confirmedAdvisor.review_count,
          location_display: confirmedAdvisor.location_display,
          specialties: confirmedAdvisor.specialties,
          fee_description: confirmedAdvisor.fee_description,
          verified: confirmedAdvisor.verified,
        },
      });
    }

    // Fall through to lead creation with this advisor pre-resolved.
    // We reassign matchedAdvisor below by jumping past the matching block.
    // Use a goto-equivalent: wrap remainder in a labeled block isn't possible in TS,
    // so we set a flag and skip the matching section entirely.
    const resolvedAdvisor = confirmedAdvisor as Record<string, unknown>;
    const resolvedId = confirm_advisor_id;

    let revenue_value_cents_confirmed = 0;
    const { data: tierData } = await supabase
      .from("professionals")
      .select("advisor_tier")
      .eq("id", resolvedId)
      .single();
    if (tierData) {
      const tierFees: Record<string, number> = { gold: 6000, silver: 8000, bronze: 10000 };
      revenue_value_cents_confirmed = tierFees[(tierData.advisor_tier as string) || "bronze"] ?? 10000;
    }

    const { data: confirmedLead, error: confirmedLeadError } = await supabase
      .from("leads")
      .insert({
        lead_type,
        professional_id: resolvedId,
        user_email: normalizedEmail,
        user_name: typeof user_name === "string" ? user_name.trim() : null,
        user_phone: typeof user_phone === "string" ? user_phone.trim() : null,
        sms_consent: sms_consent === true,
        user_location_state: userState,
        user_intent: user_intent ?? null,
        revenue_value_cents: revenue_value_cents_confirmed,
        source_page: typeof source_page === "string" ? source_page : null,
        utm_source: (utm as UtmParams).utm_source ?? null,
        utm_medium: (utm as UtmParams).utm_medium ?? null,
        utm_campaign: (utm as UtmParams).utm_campaign ?? null,
        status: "sent",
        advisor_notified_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (confirmedLeadError) {
      log.error("Confirmed lead insert failed", { error: confirmedLeadError.message });
      return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
    }

    const { error: plError } = await supabase.from("professional_leads").insert({
      professional_id: resolvedId,
      user_name: typeof user_name === "string" ? user_name.trim() : null,
      user_email: normalizedEmail,
      user_phone: typeof user_phone === "string" ? user_phone.trim() : null,
      message: `Auto-matched via quiz (confirmed). Need: ${need}. Context: ${(context || []).join(", ")}. Budget: ${user_intent?.budget || "not specified"}.`,
      source_page: typeof source_page === "string" ? source_page : null,
      utm_source: (utm as UtmParams).utm_source ?? null,
      utm_medium: (utm as UtmParams).utm_medium ?? null,
      utm_campaign: (utm as UtmParams).utm_campaign ?? null,
      status: "new",
    });
    if (plError) log.error("professional_leads insert failed (confirm path)", { error: plError.message, advisor_id: resolvedId });

    const { error: lldError } = await supabase.from("professionals").update({ last_lead_date: new Date().toISOString() }).eq("id", resolvedId);
    if (lldError) log.error("last_lead_date update failed (confirm path)", { error: lldError.message, advisor_id: resolvedId });

    if (resolvedAdvisor.email) {
      sendNewLeadNotification(
        resolvedAdvisor.email as string,
        resolvedAdvisor.name as string,
        typeof user_name === "string" ? user_name.trim() : "A potential client",
        normalizedEmail,
        typeof user_phone === "string" ? user_phone.trim() : null,
        userState,
        need,
        context,
      ).catch(() => null);

      sendLeadConfirmationToUser(
        normalizedEmail,
        typeof user_name === "string" ? user_name.trim() : "there",
        resolvedAdvisor.name as string,
        resolvedAdvisor.type as string,
        (resolvedAdvisor.firm_name as string) || null,
      ).catch(() => null);
    }

    log.info("Confirmed lead submitted", { lead_id: confirmedLead?.id, advisor_id: resolvedId });

    return NextResponse.json({
      success: true,
      lead_id: confirmedLead?.id,
      matched: {
        id: resolvedAdvisor.id,
        slug: resolvedAdvisor.slug,
        name: resolvedAdvisor.name,
        firm_name: resolvedAdvisor.firm_name,
        type: resolvedAdvisor.type,
        photo_url: resolvedAdvisor.photo_url,
        rating: resolvedAdvisor.rating,
        review_count: resolvedAdvisor.review_count,
        location_display: resolvedAdvisor.location_display,
        specialties: resolvedAdvisor.specialties,
        fee_description: resolvedAdvisor.fee_description,
        verified: resolvedAdvisor.verified,
      },
    });
  }

  // Build exclusion list: client-provided + any advisors this email was matched with in last 7 days
  const excludeIds = new Set<number>(Array.isArray(exclude_advisor_ids) ? exclude_advisor_ids : []);

  // Look up recent matches for this email to prevent cross-system duplicates.
  // Skipped on contact-less dry runs (no email yet) — the email-keyed dedup
  // re-runs on the confirm call, which always carries the verified email.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (normalizedEmail) {
    const { data: recentLeads } = await supabase
      .from("leads")
      .select("professional_id")
      .eq("user_email", normalizedEmail)
      .eq("lead_type", "advisor")
      .gte("created_at", sevenDaysAgo)
      .not("professional_id", "is", null);

    if (recentLeads) {
      for (const rl of recentLeads) {
        if (rl.professional_id) excludeIds.add(rl.professional_id as number);
      }
    }

    // Also check professional_leads (direct enquiry system) for cross-system dedup
    const { data: recentEnquiries } = await supabase
      .from("professional_leads")
      .select("professional_id")
      .eq("user_email", normalizedEmail)
      .gte("created_at", sevenDaysAgo);

    if (recentEnquiries) {
      for (const re of recentEnquiries) {
        if (re.professional_id) excludeIds.add(re.professional_id as number);
      }
    }
  }

  const excludeArray = [...excludeIds];

  // 24h ago for round-robin fairness
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Helper: build match query with exclusion. Pulls up to MATCH_FETCH_LIMIT
  // candidates ordered by quality so post-fetch country-eligibility filtering
  // can skip an ineligible top pick without losing the cascading fallback.
  function buildMatchQuery(opts: { state?: string; roundRobin?: boolean; anyType?: boolean }) {
    let query = supabase
      .from("professionals")
      .select(MATCH_SELECT)
      .eq("status", "active")
      .eq("verified", true);

    if (opts.state) query = query.eq("location_state", opts.state);
    if (!opts.anyType) query = query.in("type", advisorTypes);
    if (opts.roundRobin) query = query.or(`last_lead_date.is.null,last_lead_date.lt.${oneDayAgo}`);
    if (excludeArray.length > 0) {
      // Exclude already-matched advisors
      for (const id of excludeArray) {
        query = query.neq("id", id);
      }
    }

    return query
      .order("rating", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(MATCH_FETCH_LIMIT);
  }

  // Visitor's intent country as a lowercased ISO alpha-2 ("uk" → "gb"),
  // matching the codes advisors self-declare in available_in_countries.
  const corridorCode = intentCountry
    ? intentCountryMeta(intentCountry).iso.toLowerCase()
    : null;

  const hasPreferredSpecialty = (row: Record<string, unknown>): boolean => {
    if (!preferred_specialty) return false;
    const specs = (row as { specialties?: unknown }).specialties;
    return Array.isArray(specs) && specs.some((s) => typeof s === "string" && s === preferred_specialty);
  };

  const servesCorridor = (row: Record<string, unknown>): boolean => {
    if (!corridorCode) return false;
    const served = (row as { available_in_countries?: unknown }).available_in_countries;
    return (
      Array.isArray(served) &&
      served.some((c) => typeof c === "string" && c.toLowerCase() === corridorCode)
    );
  };

  // Take the highest-ranked candidate eligible for the visitor's
  // country. When intentCountry is null, simply returns the top pick.
  //
  // Cross-border Phase A/B: prefer the first eligible advisor matching the
  // strongest available signal, in priority order:
  //   1. specialty (?specialty=X) AND corridor (serves intent country)
  //   2. specialty only
  //   3. corridor only
  //   4. standard top pick
  // Original rank order is preserved within each subset, and any miss
  // falls through so the corridor still routes to a real advisor.
  function pickFirstEligible(
    rows: ReadonlyArray<Record<string, unknown>> | null | undefined,
  ): Record<string, unknown> | null {
    if (!rows || rows.length === 0) return null;
    const eligible = filterByCountryEligibility(
      rows as ReadonlyArray<EntityWithEligibility & Record<string, unknown>>,
      intentCountry,
    );
    if (eligible.length === 0) return null;

    if (preferred_specialty && corridorCode) {
      const both = eligible.find((row) => hasPreferredSpecialty(row) && servesCorridor(row));
      if (both) return both;
    }

    if (preferred_specialty) {
      const specialist = eligible.find(hasPreferredSpecialty);
      if (specialist) return specialist;
    }

    if (corridorCode) {
      const corridorMatch = eligible.find(servesCorridor);
      if (corridorMatch) return corridorMatch;
    }

    return eligible[0] ?? null;
  }

  // Try matching with 4-level fallback
  let matchedAdvisor: Record<string, unknown> | null = null;

  // Attempt 1: Same state + round-robin + exclusion
  if (userState) {
    const { data } = await buildMatchQuery({ state: userState, roundRobin: true });
    matchedAdvisor = pickFirstEligible(data);
  }

  // Attempt 2: Same state + exclusion (ignore round-robin)
  if (!matchedAdvisor && userState) {
    const { data } = await buildMatchQuery({ state: userState });
    matchedAdvisor = pickFirstEligible(data);
  }

  // Attempt 3: Any state + exclusion
  if (!matchedAdvisor) {
    const { data } = await buildMatchQuery({});
    matchedAdvisor = pickFirstEligible(data);
  }

  // Attempt 4: Any advisor + exclusion (any type)
  if (!matchedAdvisor) {
    const { data } = await buildMatchQuery({ anyType: true });
    matchedAdvisor = pickFirstEligible(data);
  }

  // Attempt 5: Absolute fallback — if all advisors are excluded or
  // every candidate is country-ineligible, tell the user. Original
  // gate was `excludeArray.length > 0`; we also enter this branch
  // when intentCountry filtered out the entire pool so a UK visitor
  // (whose every match was blocked) gets a clear message instead of
  // a silent null-professional lead.
  if (!matchedAdvisor && (excludeArray.length > 0 || intentCountry !== null)) {
    const { data } = await supabase
      .from("professionals")
      .select(MATCH_SELECT)
      .eq("status", "active")
      .eq("verified", true)
      .order("rating", { ascending: false })
      .limit(MATCH_FETCH_LIMIT);

    const anyEligible = pickFirstEligible(data);
    if (!anyEligible) {
      // No advisors at all (or none eligible for visitor's country)
      return NextResponse.json({
        success: true,
        lead_id: null,
        matched: null,
        no_more_matches: true,
        message: intentCountry
          ? "No advisors in our network currently serve your country. Browse our full directory or contact us for help."
          : "We've matched you with all available advisors in this category. Browse our full directory for more options.",
      });
    }

    // All advisors already matched — return signal to frontend
    return NextResponse.json({
      success: true,
      lead_id: null,
      matched: null,
      no_more_matches: true,
      message: "You've been matched with all available advisors for your criteria. Browse our full directory for more options.",
    });
  }

  const matchedId = matchedAdvisor ? (matchedAdvisor.id as number) : null;

  // ─── dry_run: return matched advisor without creating any lead or sending emails ───
  if (dry_run) {
    log.info("Dry-run match", { advisor_id: matchedId, excluded: excludeArray.length });
    return NextResponse.json({
      success: true,
      lead_id: null,
      matched: matchedAdvisor
        ? {
            id: matchedAdvisor.id,
            slug: matchedAdvisor.slug,
            name: matchedAdvisor.name,
            firm_name: matchedAdvisor.firm_name,
            type: matchedAdvisor.type,
            photo_url: matchedAdvisor.photo_url,
            rating: matchedAdvisor.rating,
            review_count: matchedAdvisor.review_count,
            location_display: matchedAdvisor.location_display,
            specialties: matchedAdvisor.specialties,
            fee_description: matchedAdvisor.fee_description,
            verified: matchedAdvisor.verified,
          }
        : null,
    });
  }

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

  // On rematch: cancel previous leads so only the new advisor has an active lead
  if (rematch && Array.isArray(prev_lead_ids) && prev_lead_ids.length > 0) {
    const validPrevIds = prev_lead_ids.filter((id) => typeof id === "number");
    if (validPrevIds.length > 0) {
      // Cancel in leads table
      supabase
        .from("leads")
        .update({ status: "replaced" })
        .in("id", validPrevIds)
        .eq("user_email", normalizedEmail) // safety: only cancel leads belonging to this user
        .then(() => null, () => null);

      // Also cancel in professional_leads (advisor dashboard) — match by lead's professional_id
      supabase
        .from("leads")
        .select("professional_id")
        .in("id", validPrevIds)
        .eq("user_email", normalizedEmail)
        .then(({ data: prevLeads }) => {
          if (!prevLeads) return;
          const prevProfIds = prevLeads.map((l) => l.professional_id).filter(Boolean) as number[];
          if (prevProfIds.length > 0) {
            supabase
              .from("professional_leads")
              .update({ status: "replaced" })
              .in("professional_id", prevProfIds)
              .eq("user_email", normalizedEmail)
              .then(() => null, () => null);
          }
        }, () => null);
    }
  }

  // Insert into unified leads table
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      lead_type,
      professional_id: resolvedProfessionalId,
      user_email: normalizedEmail,
      user_name: typeof user_name === "string" ? user_name.trim() : null,
      user_phone: typeof user_phone === "string" ? user_phone.trim() : null,
      sms_consent: sms_consent === true,
      user_location_state: userState,
      user_intent: user_intent ?? null,
      revenue_value_cents,
      source_page: typeof source_page === "string" ? source_page : null,
      utm_source: (utm as UtmParams).utm_source ?? null,
      utm_medium: (utm as UtmParams).utm_medium ?? null,
      utm_campaign: (utm as UtmParams).utm_campaign ?? null,
      status: "sent",
      advisor_notified_at: resolvedProfessionalId ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    log.error("Lead insert failed", { error: error.message });
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }

  // Also insert into professional_leads for the advisor's dashboard
  if (resolvedProfessionalId) {
    const { error: plError2 } = await supabase
      .from("professional_leads")
      .insert({
        professional_id: resolvedProfessionalId,
        user_name: typeof user_name === "string" ? user_name.trim() : null,
        user_email: normalizedEmail,
        user_phone: typeof user_phone === "string" ? user_phone.trim() : null,
        message: `Auto-matched via quiz${rematch ? " (rematch)" : ""}. Need: ${need}. Context: ${(context || []).join(", ")}. Budget: ${user_intent?.budget || "not specified"}.`,
        source_page: typeof source_page === "string" ? source_page : null,
        utm_source: (utm as UtmParams).utm_source ?? null,
        utm_medium: (utm as UtmParams).utm_medium ?? null,
        utm_campaign: (utm as UtmParams).utm_campaign ?? null,
        status: "new",
      });
    if (plError2) log.error("professional_leads insert failed", { error: plError2.message, advisor_id: resolvedProfessionalId });

    // Update advisor's last_lead_date for round-robin
    const { error: lldError2 } = await supabase
      .from("professionals")
      .update({ last_lead_date: new Date().toISOString() })
      .eq("id", resolvedProfessionalId);
    if (lldError2) log.error("last_lead_date update failed", { error: lldError2.message, advisor_id: resolvedProfessionalId });
  }

  // Send email notifications (non-blocking)
  // On rematch, notify the new advisor but don't re-send the user confirmation
  if (matchedAdvisor && matchedAdvisor.email) {
    sendNewLeadNotification(
      matchedAdvisor.email as string,
      matchedAdvisor.name as string,
      typeof user_name === "string" ? user_name.trim() : "A potential client",
      normalizedEmail,
      typeof user_phone === "string" ? user_phone.trim() : null,
      userState,
      need,
      context,
    ).catch(() => null);

    if (!rematch) {
      sendLeadConfirmationToUser(
        normalizedEmail,
        typeof user_name === "string" ? user_name.trim() : "there",
        matchedAdvisor.name as string,
        matchedAdvisor.type as string,
        (matchedAdvisor.firm_name as string) || null,
      ).catch(() => null);
    }
  }

  log.info("Lead submitted with match", {
    lead_id: lead?.id,
    matched_advisor_id: matchedId,
    advisor_types: advisorTypes,
    state: userState,
    rematch: !!rematch,
    excluded: excludeArray.length,
  });

  if (lead?.id) {
    const distinctId = typeof (body as Record<string, unknown>).distinct_id === "string"
      ? (body as Record<string, unknown>).distinct_id as string
      : `anon-${crypto.randomUUID()}`;
    captureEdgeEvent(distinctId, "lead_submitted", {
      lead_source: "advisor-match",
      source_page: typeof source_page === "string" ? source_page : null,
      advisor_match_count: matchedId ? 1 : 0,
      quiz_completed: !!(user_intent?.need),
      utm_source: (utm as UtmParams).utm_source ?? null,
      utm_campaign: (utm as UtmParams).utm_campaign ?? null,
    });

    // Hot-lead auction trigger (DD-04): fire a 1-hour bidding window for
    // high-intent lead types that have a phone number supplied. Non-blocking.
    const AUCTION_ELIGIBLE_NEEDS = ["planning", "smsf", "estate", "wealth", "tax"];
    const hasPhone = typeof user_phone === "string" && user_phone.trim().length > 6;
    if (hasPhone && AUCTION_ELIGIBLE_NEEDS.includes(need)) {
      const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000";
      fetch(`${origin}/api/advisor-auction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
        },
        body: JSON.stringify({
          lead_id: lead.id,
          lead_type: need,
          location: userState,
          budget_range: user_intent?.budget ?? null,
        }),
      }).catch(() => null);
    }

    // PX-01/02: Fire outbound webhooks (CRM/Zapier) + Slack notification for
    // the matched advisor. Uses Node-runtime internal route because
    // lib/outbound-webhooks uses node:crypto (incompatible with edge runtime).
    if (resolvedProfessionalId) {
      const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000";
      fetch(`${origin}/api/internal/lead-webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
        },
        body: JSON.stringify({
          professionalId: resolvedProfessionalId,
          leadId: lead.id,
          userName: typeof user_name === "string" ? user_name.trim() : null,
          userEmail: normalizedEmail,
          userPhone: typeof user_phone === "string" ? user_phone.trim() : null,
          userState,
          need,
          context: Array.isArray(context) ? context : [],
          sourcePage: typeof source_page === "string" ? source_page : null,
        }),
      }).catch(() => null);
    }
  }

  return NextResponse.json({
    success: true,
    lead_id: lead?.id,
    matched: matchedAdvisor
      ? {
          id: matchedAdvisor.id,
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
    no_more_matches: false,
  });
}
