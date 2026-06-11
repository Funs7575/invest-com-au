/**
 * lib/getmatched/stack.ts
 *
 * Showcase G9 — "Your full wealth stack" for platform-shaped results.
 *
 * Reuses `buildStackResults` from `lib/quiz-scoring.ts` (the single scoring
 * SSOT) to surface, alongside the platform match, the best-matching super
 * fund / robo / high-interest savings product for the user's STATED answers.
 *
 * The scorer needs DB data (brokers partitioned by `platform_type`, plus the
 * `quiz_weights` rows) that isn't available client-side, so this runs
 * server-side inside `/api/get-matched/resolve` and returns an additive
 * `stack` field on the response.
 *
 * Compliance: factual criteria-matching only — "based on your stated answers".
 * Never advice, never "the right product for you".
 *
 * Reads `brokers` + `quiz_weights` via the service-role client for the same
 * reason as `lib/getmatched/top-match.ts`: this is the public unauthenticated
 * resolve path with no admin JWT, and `quiz_weights` is locked to non-anon.
 * Fail-soft — any DB error returns an empty stack and the section is hidden.
 */
// eslint-disable-next-line no-restricted-imports -- public unauthenticated get-matched path with no admin JWT reading quiz_weights (locked to non-anon); same exception as lib/getmatched/top-match.ts.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  buildStackResults,
  type QuizWeights,
  type StackQuizInputs,
  type AmountKey,
} from "@/lib/quiz-scoring";
import type { Broker } from "@/lib/types";
import { reshapeWeightRow, type QuizWeightRow } from "./top-match";
import type { ActionPlanAnswers } from "./types";

const log = logger("getmatched:stack");

/** Display-safe stack slot — a single matched product in one stack kind. */
export interface StackSlot {
  kind: "super_fund" | "savings_account" | "robo_advisor";
  slug: string;
  name: string;
  logo_url: string | null;
  rating: number | null;
  href: string;
}

export type WealthStack = StackSlot[];

const STACK_LABELS: Record<StackSlot["kind"], string> = {
  super_fund: "Super fund",
  savings_account: "Savings account",
  robo_advisor: "Robo / automated",
};

export function stackKindLabel(kind: StackSlot["kind"]): string {
  return STACK_LABELS[kind];
}

/** Map the new quiz budget bands → the legacy `AmountKey` the scorer wants. */
function mapBudgetToAmount(budget: string | null | undefined): AmountKey | undefined {
  switch (budget) {
    case "under_10k":
      return "small";
    case "10k_100k":
      return "medium";
    case "100k_500k":
      return "large";
    case "500k_1m":
      return "xlarge";
    case "1m_plus":
      return "whale";
    default:
      return undefined;
  }
}

/**
 * Map a stated risk-appetite answer onto the scorer's risk band. The quiz
 * doesn't always collect this, so the documented neutral default is
 * `"balanced"` — applied by `deriveStackInputs` when no answer maps.
 */
function mapRiskBand(answers: ActionPlanAnswers): StackQuizInputs["riskBand"] {
  const raw =
    (answers.risk_appetite as string | undefined) ??
    (answers.risk as string | undefined) ??
    (answers.experience as string | undefined) ??
    null;
  switch (raw) {
    case "conservative":
    case "safety":
      return "conservative";
    case "growth":
    case "pro":
    case "aggressive":
      return "growth";
    case "balanced":
    case "intermediate":
      return "balanced";
    default:
      return "balanced"; // documented neutral default
  }
}

/** Map a stated timeline answer onto the scorer's savings horizon. */
function mapHorizon(answers: ActionPlanAnswers): StackQuizInputs["horizon"] {
  const raw = (answers.timeline as string | undefined) ?? null;
  switch (raw) {
    case "asap":
    case "under_1y":
    case "this_year":
      return "short";
    case "1_3y":
    case "few_years":
      return "mid";
    case "3y_plus":
    case "long_term":
      return "long";
    default:
      return "mid"; // documented neutral default
  }
}

/**
 * Derive the `StackQuizInputs` honestly from the answer set. Where the quiz
 * has no answer-equivalent for a field, the documented neutral default of the
 * scorer is used (balanced risk, mid horizon) rather than inventing a signal.
 */
export function deriveStackInputs(answers: ActionPlanAnswers): StackQuizInputs {
  const goal = (answers.intent as string | undefined) ?? undefined;
  return {
    amount: mapBudgetToAmount(answers.budget_band as string | undefined),
    riskBand: mapRiskBand(answers),
    horizon: mapHorizon(answers),
    // Interest flags: true when the stated goal directly implies the vertical;
    // otherwise the stack still shows the kind as a complementary suggestion.
    superInterest: goal === "super",
    roboInterest: goal === "automate",
    savingsInterest: goal === "income" || goal === "grow",
    goal,
  };
}

function partitionByKind(
  brokers: Broker[],
): Partial<Record<StackSlot["kind"], Broker[]>> {
  const out: Partial<Record<StackSlot["kind"], Broker[]>> = {};
  for (const b of brokers) {
    const pt = b.platform_type;
    if (pt === "super_fund" || pt === "savings_account" || pt === "robo_advisor") {
      (out[pt] ??= []).push(b);
    }
  }
  return out;
}

/** Detail-page href for a stacked product, by kind. */
function hrefFor(slug: string, kind: StackSlot["kind"]): string {
  switch (kind) {
    case "super_fund":
      return `/super/${slug}`;
    case "savings_account":
      return `/savings/${slug}`;
    case "robo_advisor":
      return `/robo/${slug}`;
  }
}

/**
 * Build the wealth stack server-side. Returns one best-match slot per kind
 * that has supply, or [] on any failure / no data (caller hides the section).
 */
export async function computeWealthStack(
  answers: ActionPlanAnswers,
): Promise<WealthStack> {
  try {
    const supabase = createAdminClient();
    const [brokersRes, weightsRes] = await Promise.all([
      supabase.from("brokers").select("*").eq("status", "active"),
      supabase.from("quiz_weights").select("*"),
    ]);
    if (brokersRes.error) throw brokersRes.error;
    if (weightsRes.error) throw weightsRes.error;

    const brokers = (brokersRes.data ?? []) as Broker[];
    const weightRows = (weightsRes.data ?? []) as QuizWeightRow[];
    if (brokers.length === 0 || weightRows.length === 0) return [];

    const weightsMap: Record<string, QuizWeights> = {};
    for (const row of weightRows) weightsMap[row.broker_slug] = reshapeWeightRow(row);

    const byKind = partitionByKind(brokers);
    const inputs = deriveStackInputs(answers);

    const results = buildStackResults({
      inputs,
      perKind: {
        super_fund: byKind.super_fund
          ? { brokers: byKind.super_fund, weights: weightsMap }
          : undefined,
        savings_account: byKind.savings_account
          ? { brokers: byKind.savings_account, weights: weightsMap }
          : undefined,
        robo_advisor: byKind.robo_advisor
          ? { brokers: byKind.robo_advisor, weights: weightsMap }
          : undefined,
      },
      limit: 1,
    });

    const stack: WealthStack = [];
    for (const kind of ["super_fund", "savings_account", "robo_advisor"] as const) {
      const top = results[kind]?.[0];
      if (top?.broker) {
        stack.push({
          kind,
          slug: top.broker.slug,
          name: top.broker.name,
          logo_url: top.broker.logo_url ?? null,
          rating: top.broker.rating ?? null,
          href: hrefFor(top.broker.slug, kind),
        });
      }
    }
    return stack;
  } catch (err) {
    log.warn("computeWealthStack failed (hiding stack)", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
