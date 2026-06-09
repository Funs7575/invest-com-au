/**
 * POST /api/advisor-match — server-side scored advisor matching for the quiz.
 *
 * The quiz advisor path used to query `professionals` directly from the
 * browser and order by `rating DESC`, which (a) shipped the matching column
 * set to the client, (b) skipped the country-eligibility gate, and (c) ignored
 * the ~9 signals the quiz collects. This route moves the compute server-side:
 * it reads candidates with the service-role client, scores them with the pure
 * `scoreQuizAdvisors` engine (specialty/budget/location/corridor/quality +
 * eligibility), and returns only a WHITELISTED, ranked set — no email/phone or
 * internal columns ever leave the server.
 *
 * COMPLIANCE: factual stated-profile overlap only, not RG 234/256 advice.
 * Public + unauthenticated (the quiz is open); a generous fail-open per-IP
 * limit deters scraping without penalising real quiz-takers.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  scoreQuizAdvisors,
  type QuizAdvisorCandidate,
  type QuizAdvisorScoringContext,
} from "@/lib/quiz-advisor-scoring";

const log = logger("api:advisor-match");

export const runtime = "nodejs";

// Quiz advisor_type slug → DB `type`. Mirrors TYPE_DB_MAP in
// app/quiz/_components/AdvisorResultsScreen.tsx. "not-sure"/unknown → no type
// filter (match broadly, then rank).
const TYPE_DB_MAP: Record<string, string> = {
  "mortgage-broker": "mortgage_broker",
  "buyers-agent": "buyers_agent",
  "financial-planner": "financial_planner",
  "smsf-accountant": "smsf_accountant",
  "tax-agent": "tax_agent",
  "insurance-broker": "insurance_broker",
  "estate-planner": "estate_planner",
};

const Body = z.object({
  advisorType: z.string().max(40),
  goal: z.string().max(40).optional(),
  amount: z.string().max(20).optional(),
  budget: z.string().max(20).optional(),
  state: z.string().max(10).optional(),
  isInternational: z.boolean().optional(),
  investorCountry: z.string().max(20).optional(),
  visaStatus: z.string().max(40).optional(),
  investorGoalIntl: z.string().max(40).optional(),
  excludeIds: z.array(z.number()).max(50).optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

const asStr = (v: unknown): string | null => (typeof v === "string" ? v : null);
const asNum = (v: unknown): number | null => (typeof v === "number" ? v : null);
const asBool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const asStrArr = (v: unknown): string[] | null =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : null;

/** Whitelist a raw `professionals` row into the safe candidate shape the
 *  scorer + client need. Never includes email/phone or internal columns. */
function toCandidate(row: Record<string, unknown>): QuizAdvisorCandidate {
  return {
    id: row.id as number,
    slug: asStr(row.slug) ?? "",
    name: asStr(row.name) ?? "",
    firm_name: asStr(row.firm_name),
    type: asStr(row.type) ?? "",
    photo_url: asStr(row.photo_url),
    rating: asNum(row.rating),
    review_count: asNum(row.review_count),
    location_display: asStr(row.location_display),
    location_state: asStr(row.location_state),
    office_states: asStrArr(row.office_states),
    specialties: asStrArr(row.specialties),
    fee_description: asStr(row.fee_description),
    verified: asBool(row.verified),
    min_investment_cents: asNum(row.min_investment_cents),
    minimum_investment_cents: asNum(row.minimum_investment_cents),
    accepts_new_clients: asBool(row.accepts_new_clients),
    accepting_new_clients: asBool(row.accepting_new_clients),
    availability_status: asStr(row.availability_status),
    available_in_countries: asStrArr(row.available_in_countries),
    firb_specialist: asBool(row.firb_specialist),
    international_tax_specialist: asBool(row.international_tax_specialist),
    accepts_international_clients: asBool(row.accepts_international_clients),
    languages: asStrArr(row.languages),
    years_experience: asNum(row.years_experience),
    avg_response_minutes: asNum(row.avg_response_minutes),
    response_time_hours: asNum(row.response_time_hours),
    initial_consultation_free: asBool(row.initial_consultation_free),
    trust_score_overall: asNum(row.trust_score_overall),
    country_eligibility: (row.country_eligibility ?? null) as QuizAdvisorCandidate["country_eligibility"],
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAllowed("advisor_match", ipKey(request), { max: 60, refillPerSec: 1 }))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch {
    /* fail open — never block a real quiz-taker on rate-limit infra */
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const input = parsed.data;
  const dbType = TYPE_DB_MAP[input.advisorType] ?? "";

  const supabase = createAdminClient();
  let query = supabase
    .from("professionals")
    .select("*")
    .eq("status", "active")
    .eq("verified", true);
  if (dbType) query = query.eq("type", dbType);

  // Fetch a candidate pool (coarse rating pre-sort) and let the scorer rank it.
  // We deliberately do NOT hard-filter by state — the scorer rewards local
  // matches but still surfaces good non-local advisors instead of an empty list.
  const { data, error } = await query
    .order("rating", { ascending: false })
    .order("review_count", { ascending: false })
    .limit(40);

  if (error) {
    log.error("advisor-match read failed", { err: error.message });
    return NextResponse.json({ error: "Failed to match" }, { status: 502 });
  }

  const exclude = new Set(input.excludeIds ?? []);
  const candidates = (data ?? [])
    .map((r) => toCandidate(r as Record<string, unknown>))
    .filter((c) => !exclude.has(c.id));

  const ctx: QuizAdvisorScoringContext = {
    advisorType: input.advisorType,
    goal: input.goal,
    amount: input.amount,
    budget: input.budget,
    userState: input.state,
    isInternational: input.isInternational,
    investorCountry: input.investorCountry,
    visaStatus: input.visaStatus,
    investorGoalIntl: input.investorGoalIntl,
  };

  // Whitelist the OUTPUT too — the client only needs display + reason fields
  // plus the score/band. Internal scoring inputs (trust score, eligibility
  // lists, response times, minimums) never leave the server.
  const advisors = scoreQuizAdvisors(candidates, ctx, input.limit ?? 5).map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    firm_name: a.firm_name,
    type: a.type,
    photo_url: a.photo_url,
    rating: a.rating,
    review_count: a.review_count,
    location_display: a.location_display,
    location_state: a.location_state,
    specialties: a.specialties,
    fee_description: a.fee_description,
    verified: a.verified,
    accepts_international_clients: a.accepts_international_clients,
    international_tax_specialist: a.international_tax_specialist,
    firb_specialist: a.firb_specialist,
    languages: a.languages,
    available_in_countries: a.available_in_countries,
    years_experience: a.years_experience,
    matchScore: a.matchScore,
    confidence: a.confidence,
  }));

  return NextResponse.json({ advisors, total: candidates.length });
}
