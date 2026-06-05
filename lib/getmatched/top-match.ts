/**
 * Top-match selector for the Get Matched result screen.
 *
 * When the resolved route is `compare`, we want to surface a hero card
 * with the highest-scored broker for the user's goal + amount combo, an
 * affiliate-tracked CTA, and a 1-line "why this broker" string. This is
 * the revenue-aware moment the old quiz had — porting the scoring path
 * directly so we don't fork logic.
 *
 * The compute is wrapped in a try/catch and falls back gracefully: if
 * `quiz_weights` or `brokers` can't be queried, we return null and the
 * result screen renders without the hero card (action plan + checklist
 * still display).
 *
 * `brokers` is public anon-readable, but `quiz_weights` is being locked down to
 * non-anon: its tuned ranking weights are commercially sensitive and were
 * trivially extractable via the embedded anon key. The only caller is the
 * public, unauthenticated `/api/get-matched/resolve` route — which carries no
 * admin JWT — so once the `quiz_weights` SELECT policy is restricted, an
 * RLS-respecting anon read would return nothing. These reads therefore use the
 * service-role client; it bypasses RLS, so the `status = 'active'` broker
 * filter is applied explicitly in the query below.
 */

// eslint-disable-next-line no-restricted-imports -- public unauthenticated get-matched path with no admin JWT reading quiz_weights, which is being locked to non-anon; service-role required so the read survives the SELECT-policy restriction.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  scoreQuizResults,
  type QuizWeights,
  type AmountKey,
} from "@/lib/quiz-scoring";
import type { Broker } from "@/lib/types";

import type { ActionPlanAnswers, TopMatch, Vertical } from "./types";

const log = logger("getmatched:top-match");

/** A `quiz_weights` row as Supabase returns it — flat, suffixed `*_weight` columns. */
export type QuizWeightRow = {
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

/**
 * Remap a flat `quiz_weights` row onto the scorer's `QuizWeights` shape.
 * The DB columns are suffixed (`beginner_weight`) but `QuizWeights`/`WeightKey`
 * are unsuffixed (`beginner`). The previous `{ broker_slug, ...weights } as
 * QuizWeights` produced an object keyed by `*_weight`, so the scorer read
 * `scores["beginner"]` → `undefined` → `0` for EVERY category — silently
 * dropping the user's quiz answers and collapsing the match to the rating
 * tiebreaker. The `as QuizWeights` cast hid the mismatch from the type-checker.
 */
export function reshapeWeightRow(row: QuizWeightRow): QuizWeights {
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

/**
 * The new quiz uses different budget bucket labels than the legacy
 * `AmountKey` enum the scorer expects. Map them.
 */
function mapBudgetToAmount(budget: string | null | undefined): AmountKey | undefined {
  switch (budget) {
    case "under_10k":  return "small";
    case "10k_100k":   return "medium";
    case "100k_500k":  return "large";
    case "500k_1m":    return "xlarge";
    case "1m_plus":    return "whale";
    default:           return undefined;
  }
}

/**
 * The scoring map (`ANSWER_WEIGHT_MAP`) uses legacy answer keys. The new
 * quiz uses the same keys for goal (`grow`, `crypto`, `trade`, `automate`,
 * `super`, `property`) so it Just Works™. This helper extracts the
 * answers list in the shape the scorer expects.
 */
function buildAnswersList(answers: ActionPlanAnswers): string[] {
  const out: string[] = [];
  const goal = answers.intent as string | undefined;
  const propertySub = answers.property_sub as string | undefined;
  const experience = answers.experience as string | undefined;
  if (goal) out.push(goal);
  if (propertySub === "reit") out.push("property-reit");
  if (propertySub === "smsf") out.push("property-super");
  if (experience) out.push(experience);
  return out;
}

function oneLineWhy(broker: Broker, vertical: Vertical | null): string {
  const parts: string[] = [];
  if (broker.rating) parts.push(`${broker.rating.toFixed(1)} / 5`);
  if (broker.chess_sponsored) parts.push("CHESS sponsored");
  if (vertical === "crypto" && broker.is_crypto) parts.push("Crypto support");
  if (broker.asx_fee_value !== null && broker.asx_fee_value !== undefined) {
    parts.push(`ASX from $${broker.asx_fee_value}`);
  }
  return parts.slice(0, 3).join(" · ") || "Top match based on your answers";
}

/**
 * Compute the affiliate-tracked top match. Returns null on any DB failure
 * so the caller can skip rendering the hero card.
 */
export async function computeTopMatch(
  answers: ActionPlanAnswers,
  vertical: Vertical | null,
): Promise<TopMatch | null> {
  try {
    const supabase = createAdminClient();

    // Load active brokers + their scoring weights in parallel.
    const [brokersRes, weightsRes] = await Promise.all([
      supabase.from("brokers").select("*").eq("status", "active"),
      supabase.from("quiz_weights").select("*"),
    ]);

    if (brokersRes.error) throw brokersRes.error;
    if (weightsRes.error) throw weightsRes.error;

    const brokers = (brokersRes.data ?? []) as Broker[];
    const weightRows = (weightsRes.data ?? []) as QuizWeightRow[];

    if (brokers.length === 0 || weightRows.length === 0) return null;

    // Reshape `quiz_weights` rows → `Record<slug, QuizWeights>`
    const weightsMap: Record<string, QuizWeights> = {};
    for (const row of weightRows) {
      weightsMap[row.broker_slug] = reshapeWeightRow(row);
    }

    const answersList = buildAnswersList(answers);
    const amount = mapBudgetToAmount(answers.budget_band as string | undefined);
    const goal = answers.intent as string | undefined;

    // Placement winners (paid boosts) are intentionally omitted from the
    // result hero card — the scorer applies them mainly for the homepage
    // rotation. The action plan should pick the most objective top match.
    const scored = scoreQuizResults(
      answersList,
      weightsMap,
      brokers,
      [],
      amount,
      goal,
    );

    const top = scored[0];
    if (!top || !top.broker) return null;

    return {
      kind: "broker",
      slug: top.broker.slug,
      name: top.broker.name,
      logo_url: top.broker.logo_url ?? null,
      rating: top.broker.rating ?? null,
      rating_count: null,
      one_line_why: oneLineWhy(top.broker, vertical),
      cta_label: "See full review",
      // The /broker/<slug> page handles affiliate-link rendering + tracking.
      cta_href: `/broker/${top.broker.slug}`,
      vertical,
    };
  } catch (err) {
    log.warn("computeTopMatch failed (skipping hero card)", {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Multi-match variant: returns the top-N brokers as a carousel-ready
 * array. Each one carries a `tier` (1 = best, 2-N = runner-ups) so the
 * client can style the hero card differently from the comparison slots.
 *
 * Same scoring path as `computeTopMatch`. Same defensive try/catch —
 * returns [] on any DB failure so the caller can skip the carousel.
 */
export async function computeTopMatches(
  answers: ActionPlanAnswers,
  vertical: Vertical | null,
  limit = 3,
): Promise<TopMatch[]> {
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
    for (const row of weightRows) {
      weightsMap[row.broker_slug] = reshapeWeightRow(row);
    }

    const answersList = buildAnswersList(answers);
    const amount = mapBudgetToAmount(answers.budget_band as string | undefined);
    const goal = answers.intent as string | undefined;

    const scored = scoreQuizResults(
      answersList,
      weightsMap,
      brokers,
      [],
      amount,
      goal,
    );

    return scored
      .filter((s) => s.broker)
      .slice(0, limit)
      .map((s, i) => ({
        kind: "broker" as const,
        slug: s.broker!.slug,
        name: s.broker!.name,
        logo_url: s.broker!.logo_url ?? null,
        rating: s.broker!.rating ?? null,
        rating_count: null,
        one_line_why: oneLineWhy(s.broker!, vertical),
        cta_label: i === 0 ? "See full review" : "View",
        cta_href: `/broker/${s.broker!.slug}`,
        vertical,
        tier: i + 1,
      }));
  } catch (err) {
    log.warn("computeTopMatches failed (skipping carousel)", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
