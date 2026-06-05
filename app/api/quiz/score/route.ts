/**
 * POST /api/quiz/score — server-side quiz scoring.
 *
 * The public quiz (app/quiz) used to fetch the full, tuned `quiz_weights`
 * table to the browser via /api/quiz/data and score locally. That shipped a
 * commercially-sensitive ranking asset to every visitor. This route moves the
 * compute server-side: it reads `brokers` + `quiz_weights` with the
 * service-role client, runs the exact same `scoreQuizResults` /
 * `buildStackResults` logic, and returns only the ordered results. Raw weights
 * never leave the server.
 *
 * Broker objects in the response are passed through stripInternalBrokerFields()
 * so the internal commercial columns (CPA, sponsorship fees, commission terms,
 * EPC, promoted-placement) — which `select("*")` pulls in for scoring fidelity
 * — are removed before serialisation.
 *
 * Public + unauthenticated (the quiz is open). A generous per-IP rate limit
 * (fail-open) deters scraping the scorer to reverse-engineer the weights
 * without penalising real users on a revenue-critical funnel.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { stripInternalBrokerFields } from "@/lib/brokers/sanitize";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  scoreQuizResults,
  buildStackResults,
  type QuizWeights,
  type AmountKey,
  type StackQuizInputs,
  type ScoredResult,
  type VerticalScoredResult,
} from "@/lib/quiz-scoring";
import type { Broker } from "@/lib/types";

const log = logger("api:quiz:score");

export const runtime = "nodejs";

const AmountEnum = z.enum(["small", "medium", "large", "xlarge", "whale"]);

const StackSchema = z.object({
  amount: AmountEnum.optional(),
  riskBand: z.enum(["conservative", "balanced", "growth"]).optional(),
  horizon: z.enum(["short", "mid", "long"]).optional(),
  superInterest: z.boolean().optional(),
  roboInterest: z.boolean().optional(),
  savingsInterest: z.boolean().optional(),
  goal: z.string().max(64).optional(),
});

const Body = z.object({
  answers: z.array(z.string().max(64)).max(40),
  amount: AmountEnum.optional(),
  goal: z.string().max(64).optional(),
  stack: StackSchema.optional(),
  campaignWinners: z.array(z.object({ broker_slug: z.string().max(120) })).max(50).optional(),
});

/** Flat `quiz_weights` DB row → the scorer's `QuizWeights` shape. */
type QuizWeightRow = {
  broker_slug: string;
  beginner_weight: number | null;
  low_fee_weight: number | null;
  us_shares_weight: number | null;
  smsf_weight: number | null;
  crypto_weight: number | null;
  advanced_weight: number | null;
  property_weight: number | null;
  robo_weight: number | null;
};

function reshapeWeightRow(row: QuizWeightRow): QuizWeights {
  return {
    beginner: row.beginner_weight ?? 0,
    low_fee: row.low_fee_weight ?? 0,
    us_shares: row.us_shares_weight ?? 0,
    smsf: row.smsf_weight ?? 0,
    crypto: row.crypto_weight ?? 0,
    advanced: row.advanced_weight ?? 0,
    property: row.property_weight ?? 0,
    robo: row.robo_weight ?? 0,
  };
}

// Per-kind fallback weights for brokers absent from quiz_weights — mirrors the
// defaults the client used so a product with no tuned row still ranks sanely.
const STACK_FALLBACK: Record<"super_fund" | "savings_account" | "robo_advisor", QuizWeights> = {
  super_fund: { beginner: 5, low_fee: 5, us_shares: 0, smsf: 7, crypto: 0, advanced: 3, property: 3, robo: 7 },
  savings_account: { beginner: 6, low_fee: 8, us_shares: 0, smsf: 3, crypto: 0, advanced: 2, property: 0, robo: 3 },
  robo_advisor: { beginner: 8, low_fee: 6, us_shares: 3, smsf: 3, crypto: 0, advanced: 2, property: 2, robo: 9 },
};

/** Strip internal commercial fields from the broker carried by a scored row. */
function sanitizeScored<T extends { broker?: Broker | null }>(row: T): T {
  return row.broker ? { ...row, broker: stripInternalBrokerFields(row.broker) } : row;
}

export async function POST(request: NextRequest) {
  // Fail-open rate limit — never block a real quiz-taker on rate-limit infra.
  try {
    if (!(await isAllowed("quiz_score", ipKey(request), { max: 120, refillPerSec: 2 }))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch {
    /* fail open */
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { answers, amount, goal, stack, campaignWinners } = parsed.data;

  const supabase = createAdminClient();
  const [brokersRes, weightsRes] = await Promise.all([
    supabase.from("brokers").select("*").eq("status", "active"),
    supabase.from("quiz_weights").select("*"),
  ]);

  if (brokersRes.error) {
    log.error("Quiz score broker read failed", { err: brokersRes.error.message });
    return NextResponse.json({ error: "Failed to score" }, { status: 502 });
  }

  const brokers = (brokersRes.data ?? []) as Broker[];
  const weightRows = (weightsRes.data ?? []) as QuizWeightRow[];

  const weightsMap: Record<string, QuizWeights> = {};
  for (const row of weightRows) weightsMap[row.broker_slug] = reshapeWeightRow(row);

  // ── Primary broker ranking (identical to the former client compute) ──
  const results: ScoredResult[] = scoreQuizResults(
    answers,
    weightsMap,
    brokers,
    campaignWinners ?? [],
    amount as AmountKey | undefined,
    goal,
  );

  // ── Wealth-stack per-vertical results ──
  let stackResults: Partial<Record<"super_fund" | "savings_account" | "robo_advisor", VerticalScoredResult[]>> = {};
  if (stack) {
    const inputs = stack as StackQuizInputs;
    const perKind: Parameters<typeof buildStackResults>[0]["perKind"] = {};

    const wantSuper = inputs.superInterest || inputs.goal === "super" || inputs.goal === "grow";
    const wantSavings = inputs.savingsInterest || inputs.amount === "small" || inputs.goal === "property";
    const wantRobo = inputs.roboInterest || inputs.goal === "automate";

    const sliceFor = (kind: "super_fund" | "savings_account" | "robo_advisor", platformTypes: string[]) => {
      const slice = brokers.filter((b) => b.platform_type && platformTypes.includes(b.platform_type));
      if (slice.length === 0) return undefined;
      const w: Record<string, QuizWeights> = {};
      for (const b of slice) w[b.slug] = weightsMap[b.slug] ?? STACK_FALLBACK[kind];
      return { brokers: slice, weights: w };
    };

    if (wantSuper) {
      const s = sliceFor("super_fund", ["super_fund"]);
      if (s) perKind.super_fund = s;
    }
    if (wantSavings) {
      const s = sliceFor("savings_account", ["savings_account", "term_deposit"]);
      if (s) perKind.savings_account = s;
    }
    if (wantRobo) {
      const s = sliceFor("robo_advisor", ["robo_advisor"]);
      if (s) perKind.robo_advisor = s;
    }

    stackResults = buildStackResults({ inputs, perKind, limit: 1 });
  }

  // Sanitise every broker object before it leaves the server.
  const safeResults = results.map(sanitizeScored);
  const safeStack: typeof stackResults = {};
  for (const [kind, rows] of Object.entries(stackResults)) {
    safeStack[kind as keyof typeof stackResults] = rows.map(sanitizeScored);
  }

  return NextResponse.json({ results: safeResults, stackResults: safeStack });
}
