import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { processAdvisorOptIns } from "@/lib/advisor-opt-ins";
import { PostJobRequest } from "@/lib/api-schemas";
import { auctionRoundsEnabled } from "@/lib/auction-rounds";
import {
  sendJobPostedConfirmation,
  sendAdvisorNewPublicJobEmail,
} from "@/lib/quote-emails";

const log = logger("quotes");

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const advisorType = params.get("advisor_type");
    const state = params.get("state");
    const limit = Math.min(50, Number(params.get("limit") || 20));

    const VALID_ADVISOR_TYPES = new Set([
      "smsf_accountant", "financial_planner", "property_advisor", "tax_agent",
      "mortgage_broker", "estate_planner", "insurance_broker", "buyers_agent",
      "wealth_manager", "aged_care_advisor", "crypto_advisor", "business_broker",
      "migration_agent",
    ]);
    const AU_STATES = new Set(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]);

    const admin = createAdminClient();
    const now = new Date().toISOString();

    let query = admin
      .from("advisor_auctions")
      .select("id, slug, job_title, job_description, budget_band, advisor_types, location, status, ends_at, created_at")
      .eq("is_public", true)
      .eq("source", "public_job")
      .eq("flow_type", "auction")
      .eq("status", "open")
      .gt("ends_at", now)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (advisorType && VALID_ADVISOR_TYPES.has(advisorType)) {
      query = query.contains("advisor_types", [advisorType]);
    }
    if (state && AU_STATES.has(state)) {
      query = query.eq("location", state);
    }

    const { data, error } = await query;
    if (error) {
      log.error("Failed to fetch jobs", { error: error.message });
      return NextResponse.json({ error: "Failed to fetch jobs." }, { status: 500 });
    }

    const ids = (data || []).map((j) => j.id);
    let bidCounts: Record<number, number> = {};
    if (ids.length > 0) {
      const { data: bids } = await admin
        .from("advisor_auction_bids")
        .select("auction_id")
        .in("auction_id", ids)
        .eq("status", "active");
      bidCounts = (bids || []).reduce<Record<number, number>>((acc, row) => {
        const id = row.auction_id as number;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});
    }

    return NextResponse.json({
      jobs: (data || []).map((j) => ({ ...j, bid_count: bidCounts[j.id as number] || 0 })),
    });
  } catch (err) {
    log.error("Quotes GET error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to fetch jobs." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`quotes-post:${ip}`, 5, 60)) {
      return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    // Honeypot check before Zod (prevents leaking schema to bots)
    const maybeBot = rawBody as Record<string, unknown>;
    if (maybeBot.website || maybeBot.fax) {
      return NextResponse.json({ success: true, job_id: null, slug: null });
    }

    const parsed = PostJobRequest.safeParse(rawBody);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Invalid request body.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const body = parsed.data;

    // Optional referral: ?ref=<advisor-slug>. Resolved to professionals.id and
    // stamped on the auction so #12 (referral credits) can attribute later.
    const refSlug = request.nextUrl.searchParams.get("ref")?.trim() ?? "";
    let referrerAdvisorId: number | null = null;
    if (refSlug && /^[a-z0-9-]{1,80}$/.test(refSlug)) {
      const adminLookup = createAdminClient();
      const { data: refPro } = await adminLookup
        .from("professionals")
        .select("id")
        .eq("slug", refSlug)
        .eq("status", "active")
        .maybeSingle();
      if (refPro) referrerAdvisorId = refPro.id as number;
    }

    // Extra email validation (disposable domains)
    if (!isValidEmail(body.contact_email) || isDisposableEmail(body.contact_email)) {
      return NextResponse.json({ error: "Please use a real email address." }, { status: 400 });
    }

    const cleanTypes = body.advisor_types.filter(Boolean);

    const admin = createAdminClient();

    const endsAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const baseSlug = slugify(body.job_title);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Idea #11 — only honour a sealed selection when the auction_rounds flag is
    // ON (keyed by the poster's email for sticky rollout). Flag off ⇒ we omit
    // the column entirely so the insert is byte-identical to today and stays
    // fail-soft if the migration hasn't been applied yet.
    const sealedRequested = body.bid_visibility === "sealed";
    const roundsOn = sealedRequested
      ? await auctionRoundsEnabled(body.contact_email)
      : false;
    const visibilityField =
      sealedRequested && roundsOn ? { bid_visibility: "sealed" as const } : {};

    const { data: auction, error: insertError } = await admin
      .from("advisor_auctions")
      .insert({
        source: "public_job",
        flow_type: "auction",
        is_public: true,
        slug,
        job_title: body.job_title.trim(),
        job_description: body.job_description.trim(),
        budget_band: body.budget_band,
        advisor_types: cleanTypes,
        location: body.location_state,
        contact_name: body.contact_name.trim(),
        contact_email: body.contact_email.toLowerCase().trim(),
        status: "open",
        ends_at: endsAt,
        referrer_advisor_id: referrerAdvisorId,
        ...visibilityField,
      })
      .select("id, slug")
      .single();

    if (insertError || !auction) {
      log.error("Failed to create public job", { error: insertError?.message });
      return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
    }

    // Opt-in fan-out (for lead tracking, uses job_posting source)
    processAdvisorOptIns({
      admin,
      source: "job_posting",
      job_posting_id: auction.id,
      advisor_types: cleanTypes,
      contact_email: body.contact_email,
      contact_name: body.contact_name,
      contact_phone: body.contact_phone,
      user_location_state: body.location_state,
      context_note: `Job posted: ${body.job_title.slice(0, 80)}`,
    }).catch((err) =>
      log.warn("Job opt-in fan-out failed", { err: err instanceof Error ? err.message : String(err) })
    );

    // Email consumer confirmation (fire-and-forget)
    sendJobPostedConfirmation(
      body.contact_email.toLowerCase().trim(),
      body.contact_name.trim().split(" ")[0] ?? body.contact_name.trim(),
      body.job_title.trim(),
      auction.slug,
      cleanTypes,
    ).catch((err) =>
      log.warn("Job confirmation email failed", { err: err instanceof Error ? err.message : String(err) })
    );

    // Notify matching advisors about the new public job (fire-and-forget)
    notifyMatchingAdvisors(admin, auction.id, auction.slug, body, cleanTypes).catch((err) =>
      log.warn("Advisor job notification failed", { err: err instanceof Error ? err.message : String(err) })
    );

    log.info("Public job created", { jobId: auction.id, slug: auction.slug, types: cleanTypes });

    return NextResponse.json({
      success: true,
      job_id: auction.id,
      slug: auction.slug,
      ends_at: endsAt,
    });
  } catch (err) {
    log.error("Quotes POST error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
  }
}

async function notifyMatchingAdvisors(
  admin: ReturnType<typeof createAdminClient>,
  jobId: number,
  jobSlug: string,
  body: { job_title: string; job_description: string; budget_band: string; location_state: string },
  advisorTypes: string[],
): Promise<void> {
  // Fetch verified advisors whose type matches and who have an email
  const { data: advisors } = await admin
    .from("professionals")
    .select("email, name, type, accepts_new_clients, alert_preferences")
    .in("type", advisorTypes)
    .eq("status", "active")
    .not("email", "is", null)
    .limit(500);

  if (!advisors || advisors.length === 0) return;

  // Honour alert preferences: if the advisor has narrowed advisor_types,
  // states, or budget_bands, only notify when this job matches all of them.
  // Empty arrays = no preference = include.
  const eligible = advisors.filter((a) => {
    if (a.accepts_new_clients === false) return false;
    const prefs = (a.alert_preferences ?? {}) as {
      advisor_types?: string[];
      states?: string[];
      budget_bands?: string[];
    };
    if (prefs.advisor_types && prefs.advisor_types.length > 0 && !prefs.advisor_types.includes(a.type as string)) {
      return false;
    }
    if (prefs.states && prefs.states.length > 0 && !prefs.states.includes(body.location_state)) {
      return false;
    }
    if (prefs.budget_bands && prefs.budget_bands.length > 0 && !prefs.budget_bands.includes(body.budget_band)) {
      return false;
    }
    return true;
  }).slice(0, 200);

  if (eligible.length === 0) {
    log.info("No eligible advisors after preferences filter", { jobId });
    return;
  }

  await Promise.allSettled(
    eligible.map((a) =>
      sendAdvisorNewPublicJobEmail(
        a.email as string,
        (a.name as string).trim().split(" ")[0] ?? (a.name as string),
        body.job_title,
        body.job_description,
        jobSlug,
        body.budget_band,
        body.location_state,
      )
    )
  );

  log.info("Advisor job notifications sent", { jobId, count: eligible.length, scanned: advisors.length });
}
