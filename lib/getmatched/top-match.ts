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
 */

// eslint-disable-next-line no-restricted-imports -- public-read of brokers + quiz_weights; service-role legitimate because we want to bypass anon-row restrictions on weight rows.
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
    const admin = createAdminClient();

    // Load active brokers + their scoring weights in parallel.
    const [brokersRes, weightsRes] = await Promise.all([
      admin.from("brokers").select("*").eq("status", "active"),
      admin.from("quiz_weights").select("*"),
    ]);

    if (brokersRes.error) throw brokersRes.error;
    if (weightsRes.error) throw weightsRes.error;

    const brokers = (brokersRes.data ?? []) as Broker[];
    const weightRows = (weightsRes.data ?? []) as Array<{
      broker_slug: string;
    } & QuizWeights>;

    if (brokers.length === 0 || weightRows.length === 0) return null;

    // Reshape `quiz_weights` rows → `Record<slug, QuizWeights>`
    const weightsMap: Record<string, QuizWeights> = {};
    for (const row of weightRows) {
      const { broker_slug, ...weights } = row;
      weightsMap[broker_slug] = weights as QuizWeights;
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
