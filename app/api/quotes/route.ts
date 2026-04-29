import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { processAdvisorOptIns } from "@/lib/advisor-opt-ins";

const log = logger("jobs");

/**
 * GET /api/jobs — Public job board feed (open jobs only).
 * POST /api/jobs — Consumer creates a job posting (Airtasker-style).
 *
 * Both use the existing advisor_auctions + advisor_auction_bids tables. A
 * consumer job is `source = 'public_job', is_public = true`. The same
 * /api/advisor-auction/bid endpoint accepts bids on these auctions.
 */

const VALID_BUDGET_BANDS = new Set(["under_500", "500_2k", "2k_5k", "5k_10k", "10k_plus", "not_sure"]);

const VALID_ADVISOR_TYPES = new Set([
  "smsf_accountant",
  "financial_planner",
  "property_advisor",
  "tax_agent",
  "mortgage_broker",
  "estate_planner",
  "insurance_broker",
  "buyers_agent",
  "wealth_manager",
  "aged_care_advisor",
  "crypto_advisor",
  "business_broker",
  "migration_agent",
]);

const AU_STATES = new Set(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]);

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

    const admin = createAdminClient();
    const now = new Date().toISOString();

    let query = admin
      .from("advisor_auctions")
      .select(`
        id,
        slug,
        job_title,
        job_description,
        budget_band,
        advisor_types,
        location,
        status,
        ends_at,
        created_at
      `)
      .eq("is_public", true)
      .eq("source", "public_job")
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

    // Bid count per job
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
    log.error("Jobs GET error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to fetch jobs." }, { status: 500 });
  }
}

interface PostJobBody {
  job_title: string;
  job_description: string;
  budget_band: string;
  advisor_types: string[];
  location_state: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`jobs-post:${ip}`, 5, 60)) {
      return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
    }

    let body: Partial<PostJobBody>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    // Honeypot
    if ((body as Record<string, unknown>).website || (body as Record<string, unknown>).fax) {
      return NextResponse.json({ success: true, job_id: null, slug: null });
    }

    // Validation
    if (!body.job_title || body.job_title.trim().length < 8) {
      return NextResponse.json({ error: "Job title must be at least 8 characters." }, { status: 400 });
    }
    if (!body.job_description || body.job_description.trim().length < 30) {
      return NextResponse.json({ error: "Description must be at least 30 characters." }, { status: 400 });
    }
    if (!body.budget_band || !VALID_BUDGET_BANDS.has(body.budget_band)) {
      return NextResponse.json({ error: "A valid budget band is required." }, { status: 400 });
    }
    if (!Array.isArray(body.advisor_types) || body.advisor_types.length === 0) {
      return NextResponse.json({ error: "Pick at least one advisor type." }, { status: 400 });
    }
    const cleanTypes = body.advisor_types.filter((t) => VALID_ADVISOR_TYPES.has(t));
    if (cleanTypes.length === 0) {
      return NextResponse.json({ error: "Pick at least one valid advisor type." }, { status: 400 });
    }
    if (!body.location_state || !AU_STATES.has(body.location_state)) {
      return NextResponse.json({ error: "A valid state is required." }, { status: 400 });
    }
    if (!body.contact_name || body.contact_name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!body.contact_email || !isValidEmail(body.contact_email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (isDisposableEmail(body.contact_email)) {
      return NextResponse.json({ error: "Please use a real email address." }, { status: 400 });
    }

    const admin = createAdminClient();

    // 72-hour bidding window for public jobs (longer than internal lead
    // auctions because consumers are slower to check back).
    const endsAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const baseSlug = slugify(body.job_title);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const { data: auction, error: insertError } = await admin
      .from("advisor_auctions")
      .insert({
        source: "public_job",
        is_public: true,
        slug,
        job_title: body.job_title.trim(),
        job_description: body.job_description.trim(),
        budget_band: body.budget_band,
        advisor_types: cleanTypes,
        location: body.location_state,
        contact_name: body.contact_name.trim(),
        contact_email: body.contact_email.toLowerCase().trim(),
        // lead_id and lead_type are nullable for public jobs
        status: "open",
        ends_at: endsAt,
      })
      .select("id, slug")
      .single();

    if (insertError) {
      log.error("Failed to create public job", { error: insertError.message });
      return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
    }

    // Also fan out into listing_advisor_opt_ins so the existing lead
    // pipeline notifies advisors of relevant types — same as listing
    // opt-ins. This means advisors get the email even if they don't
    // refresh the public job board.
    try {
      await processAdvisorOptIns({
        admin,
        source: "job_posting",
        job_posting_id: auction.id,
        advisor_types: cleanTypes,
        contact_email: body.contact_email,
        contact_name: body.contact_name,
        contact_phone: body.contact_phone,
        user_location_state: body.location_state,
        context_note: `Job posted: ${body.job_title.slice(0, 80)}`,
      });
    } catch (err) {
      log.warn("Job opt-in fan-out failed", { err: err instanceof Error ? err.message : String(err) });
    }

    log.info("Public job created", { jobId: auction.id, slug: auction.slug, types: cleanTypes });

    return NextResponse.json({
      success: true,
      job_id: auction.id,
      slug: auction.slug,
      ends_at: endsAt,
    });
  } catch (err) {
    log.error("Jobs POST error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
  }
}
