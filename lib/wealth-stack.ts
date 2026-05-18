import type { Broker, PlatformType } from "@/lib/types";
import { scoreQuizResults, type AmountKey, type QuizWeights } from "@/lib/quiz-scoring";

// FIN_NOTEBOOK Revenue #1: the wealth-stack builder turns the quiz from
// a broker-only recommender into a multi-product recommender — broker +
// super + savings + crypto + robo — so a single user journey unlocks
// stacked commission attribution instead of one CPA per visitor.
//
// This module is the SCORING + STRUCTURE layer of that feature. It
// composes the existing `scoreQuizResults()` across product kinds and
// returns a `WealthStack` shape that pages + analytics consume.
//
// Out of scope here (separate PRs as the full 3–4 wk build lands):
//   - Quiz UI extension that gathers per-kind preferences
//   - Stack-view page UI (the visual recommendation card)
//   - Per-component commission attribution in the leads / analytics
//     pipeline (each StackComponent.broker.slug → its own attribution
//     event, not a single quiz_complete event)
//   - Sharesight-style export of the recommended stack
//
// This file ships the *core* so the larger feature can land incrementally.

/** The five product kinds we currently recommend in a stack. */
export const STACK_KINDS = [
  "share_broker",
  "super_fund",
  "savings_account",
  "crypto_exchange",
  "robo_advisor",
] as const satisfies ReadonlyArray<PlatformType>;
export type StackKind = (typeof STACK_KINDS)[number];

export interface StackComponent {
  kind: StackKind;
  slug: string;
  broker: Broker;
  /** Raw quiz score for this product within its kind. */
  score: number;
  /** 0-1 fitness signal: how strongly the user's answers asked for this kind. */
  fitness: number;
}

export interface WealthStack {
  /** The product picks, in the order they should be presented to the user. */
  components: StackComponent[];
  /**
   * For analytics / commission attribution: a stable join key that lets
   * downstream events tag every component of a single stack recommendation
   * back to the same session.
   */
  stackId: string;
}

/**
 * Goal → ordered list of kinds to surface. The first entry is the
 * "headline" pick; the rest are stack augmentations sized to the user's
 * stated goal.
 *
 * Maps to the existing quiz `goal` taxonomy (see ANSWER_WEIGHT_MAP in
 * lib/quiz-scoring.ts). Unrecognised goals fall back to a balanced
 * starter stack.
 */
const GOAL_TO_KIND_ORDER: Record<string, ReadonlyArray<StackKind>> = {
  // DIY trading focus — broker is headline, savings as a parking spot.
  trade: ["share_broker", "savings_account"],
  // Crypto-curious — crypto first, broker for traditional asset slice.
  crypto: ["crypto_exchange", "share_broker", "savings_account"],
  // Income focus — broker (dividend ETFs) + savings for liquidity.
  income: ["share_broker", "savings_account"],
  // Long-term wealth build — broker + super + savings.
  grow: ["share_broker", "super_fund", "savings_account"],
  // Property focus — savings (deposit), super (FHSS), broker (REITs).
  property: ["savings_account", "super_fund", "share_broker"],
  "property-reit": ["share_broker", "savings_account"],
  "property-super": ["super_fund", "savings_account"],
  // Super-only — single-kind stack.
  super: ["super_fund"],
  // Hands-off — robo first, super, savings.
  automate: ["robo_advisor", "super_fund", "savings_account"],
};

/**
 * Pull the right kind order for a goal. Goal is optional — the absence
 * of one means we use the balanced starter stack.
 */
export function kindsForGoal(goal: string | undefined | null): ReadonlyArray<StackKind> {
  if (!goal) return ["share_broker", "super_fund", "savings_account"];
  return GOAL_TO_KIND_ORDER[goal] ?? ["share_broker", "super_fund", "savings_account"];
}

/**
 * Crude fitness signal (0-1) — how strongly the user's quiz answers
 * imply they actually want this kind. Headline kind = 1.0, second =
 * 0.7, third = 0.5, fourth = 0.35, fifth = 0.25. Used as a UI dimming
 * cue ("we think the savings pick is a nice-to-have, not a must-have")
 * rather than as a hard filter.
 */
function fitnessForPosition(position: number): number {
  const ladder = [1.0, 0.7, 0.5, 0.35, 0.25];
  return ladder[position] ?? 0.2;
}

/**
 * Build a wealth stack from the user's quiz answers + per-kind weights.
 *
 * Weights are passed in the same shape used by the existing quiz: a
 * map of slug → QuizWeights. The caller is responsible for narrowing
 * `brokers` and `weights` to the right kind before calling — typically
 * by filtering `brokers.filter(b => b.platform_type === kind)`. This
 * keeps the scoring contract simple and lets the caller cache the
 * fetched data per kind.
 */
export function buildWealthStack(opts: {
  answers: string[];
  amount?: AmountKey;
  goal?: string;
  /**
   * Per-kind product universe. Keys are the StackKind, values are
   * `{ brokers, weights }` slices already filtered to that kind.
   */
  perKind: Partial<Record<StackKind, { brokers: Broker[]; weights: Record<string, QuizWeights> }>>;
  stackId: string;
}): WealthStack {
  const order = kindsForGoal(opts.goal);
  const components: StackComponent[] = [];

  order.forEach((kind, position) => {
    const slice = opts.perKind[kind];
    if (!slice || slice.brokers.length === 0) return;

    const scored = scoreQuizResults(
      opts.answers,
      slice.weights,
      slice.brokers,
      [], // marketplace campaign winners only apply to the broker pick today
      opts.amount,
      opts.goal,
    );
    const top = scored[0];
    if (!top || !top.broker) return;

    components.push({
      kind,
      slug: top.slug,
      broker: top.broker,
      score: top.total,
      fitness: fitnessForPosition(position),
    });
  });

  return { components, stackId: opts.stackId };
}
