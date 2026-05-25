import type { Broker } from "./types";
import { applyQuizSponsorBoost } from "./sponsorship";

export type WeightKey = "beginner" | "low_fee" | "us_shares" | "smsf" | "crypto" | "advanced" | "property" | "robo";
export type QuizWeights = Record<WeightKey, number>;
export type AmountKey = "small" | "medium" | "large" | "xlarge" | "whale";

// ─── Wealth-Stack Per-Vertical Scoring ──────────────────────────────────────
//
// The main quiz collects wealth-stack signals (super preference, savings
// horizon, robo interest) in addition to the broker-matching questions.
// These signals feed `scoreVertical()` which ranks products within a
// single vertical (super, savings, robo) using factual, criteria-based
// matching — not personal advice.
//
// Design contract: every scored item returns a `VerticalScoredResult`
// that mirrors `ScoredResult` shape so consumers can treat all verticals
// uniformly. The matching is purely criteria-driven (balance thresholds,
// fee bands, declared risk band) — no opinion on what the user *should*
// do, only what products best match their stated criteria.

/** Inputs captured by the extended quiz for wealth-stack matching. */
export interface StackQuizInputs {
  /** Amount key from the quiz amount question (re-used across verticals). */
  amount?: AmountKey;
  /** Risk band: the user's declared comfort with volatility. */
  riskBand?: "conservative" | "balanced" | "growth";
  /** Time horizon for savings / super contributions. */
  horizon?: "short" | "mid" | "long";
  /** Whether the user expressed interest in super optimisation. */
  superInterest?: boolean;
  /** Whether the user expressed interest in automated / robo investing. */
  roboInterest?: boolean;
  /** Whether the user expressed interest in a high-interest savings account. */
  savingsInterest?: boolean;
  /** Primary goal from the main quiz (passed through for kind-ordering). */
  goal?: string;
}

/** Factual scoring profile for a super fund, savings account, or robo product. */
export interface VerticalScoredResult {
  slug: string;
  total: number;
  broker?: Broker;
  /** The kind that was scored. */
  kind: "super_fund" | "savings_account" | "robo_advisor";
}

// ---------------------------------------------------------------------------
// Per-vertical answer → weight maps.
// These map the new quiz signals to numeric score contributions.
// Keeping them separate from ANSWER_WEIGHT_MAP avoids polluting the
// broker-matching logic with vertical-specific keys.
// ---------------------------------------------------------------------------

/** Risk band → super-fund score bonuses per category. */
const SUPER_RISK_BONUS: Record<"conservative" | "balanced" | "growth", Partial<QuizWeights>> = {
  conservative: { smsf: 2, low_fee: 3 },
  balanced: { beginner: 1, low_fee: 2, property: 1 },
  growth: { advanced: 2, us_shares: 2 },
};

/** Amount band → super-fund base score contribution. */
const SUPER_AMOUNT_BONUS: Record<AmountKey, number> = {
  small: 0,
  medium: 2,
  large: 4,
  xlarge: 5,
  whale: 5,
};

/** Risk band → robo-advisor score bonuses per category. */
const ROBO_RISK_BONUS: Record<"conservative" | "balanced" | "growth", Partial<QuizWeights>> = {
  conservative: { robo: 5, low_fee: 3 },
  balanced: { robo: 4, beginner: 2 },
  growth: { robo: 3, advanced: 1 },
};

/** Horizon → savings emphasis: shorter = higher reward for low-fee / safety. */
const SAVINGS_HORIZON_BONUS: Record<"short" | "mid" | "long", Partial<QuizWeights>> = {
  short: { low_fee: 5, smsf: 2 },
  mid: { low_fee: 3, beginner: 2 },
  long: { low_fee: 2, property: 1 },
};

/**
 * Score a single vertical's products given the user's stack quiz inputs.
 *
 * Works the same way as `scoreQuizResults` — sums weight contributions
 * from the user's answers and applies an amount multiplier — but uses
 * vertical-specific signal maps rather than the generic ANSWER_WEIGHT_MAP.
 *
 * AFSL compliance: returns factual criteria matches, presented as
 * "products that match your stated criteria" — not "the right product
 * for you". The calling UI must include the general-advice disclaimer.
 *
 * @param kind          Which vertical to score.
 * @param brokers       All products with `platform_type === kind`.
 * @param weights       Per-slug QuizWeights (same shape as broker quiz).
 * @param inputs        User's stack quiz inputs.
 * @param limit         Max results to return (default 3).
 */
export function scoreVertical(
  kind: "super_fund" | "savings_account" | "robo_advisor",
  brokers: Broker[],
  weights: Record<string, QuizWeights>,
  inputs: StackQuizInputs,
  limit = 3,
): VerticalScoredResult[] {
  const multiplier = inputs.amount ? (AMOUNT_MULTIPLIER[inputs.amount] ?? 1.0) : 1.0;

  const scored = Object.entries(weights).map(([slug, scores]) => {
    let total = 0;

    if (kind === "super_fund") {
      // Base score from the robo + smsf dimensions (super funds score well on these)
      total += scores.robo + scores.smsf;
      // Risk-band bonus
      if (inputs.riskBand) {
        const bonus = SUPER_RISK_BONUS[inputs.riskBand];
        for (const [k, v] of Object.entries(bonus)) {
          total += scores[k as WeightKey] * (v / 10);
        }
      }
      // Amount bonus — larger balances reward more sophisticated options
      if (inputs.amount) {
        total += SUPER_AMOUNT_BONUS[inputs.amount];
      }
    } else if (kind === "robo_advisor") {
      // Base score from the robo + beginner dimensions
      total += scores.robo * 1.5 + scores.beginner;
      // Risk-band bonus
      if (inputs.riskBand) {
        const bonus = ROBO_RISK_BONUS[inputs.riskBand];
        for (const [k, v] of Object.entries(bonus)) {
          total += scores[k as WeightKey] * (v / 10);
        }
      }
    } else {
      // savings_account: reward low-fee + safety; penalise SMSF-heavy (wrong vertical)
      total += scores.low_fee * 2 + scores.smsf;
      // Horizon bonus
      if (inputs.horizon) {
        const bonus = SAVINGS_HORIZON_BONUS[inputs.horizon];
        for (const [k, v] of Object.entries(bonus)) {
          total += scores[k as WeightKey] * (v / 10);
        }
      }
    }

    // Apply amount multiplier
    total *= multiplier;

    // Rating nudge (same formula as broker scoring for consistency)
    const broker = brokers.find((b) => b.slug === slug);
    if (broker?.rating) total *= 1 + (broker.rating - 4) * 0.1;

    return { slug, total, broker: broker ?? undefined, kind };
  });

  // Sort by total DESC, then rating DESC, then name ASC (consistent tiebreaker)
  const sorted = (scored as VerticalScoredResult[]).sort(
    (a, b) =>
      b.total - a.total ||
      (b.broker?.rating ?? 0) - (a.broker?.rating ?? 0) ||
      (a.broker?.name ?? "").localeCompare(b.broker?.name ?? "")
  );

  return sorted.slice(0, limit);
}

/**
 * Build per-vertical scored results for the wealth-stack display.
 *
 * Returns a map of kind → top results. Kinds with no products (empty
 * brokers array) are omitted rather than returning empty arrays.
 *
 * AFSL: purely factual — maps stated criteria to product attributes.
 * The calling UI is responsible for the general-advice disclaimer.
 */
export function buildStackResults(opts: {
  inputs: StackQuizInputs;
  perKind: Partial<Record<
    "super_fund" | "savings_account" | "robo_advisor",
    { brokers: Broker[]; weights: Record<string, QuizWeights> }
  >>;
  limit?: number;
}): Partial<Record<"super_fund" | "savings_account" | "robo_advisor", VerticalScoredResult[]>> {
  const result: Partial<Record<"super_fund" | "savings_account" | "robo_advisor", VerticalScoredResult[]>> = {};

  const kinds = (["super_fund", "savings_account", "robo_advisor"] as const);
  for (const kind of kinds) {
    const slice = opts.perKind[kind];
    if (!slice || slice.brokers.length === 0) continue;
    const scored = scoreVertical(kind, slice.brokers, slice.weights, opts.inputs, opts.limit ?? 3);
    if (scored.length > 0) {
      result[kind] = scored;
    }
  }

  return result;
}

export interface ScoredResult {
  slug: string;
  total: number;
  broker?: Broker;
}

/**
 * Maps goal/experience/priority answer keys → weight dimensions.
 *
 * IMPORTANT: Amount keys (small/medium/large/xlarge/whale) are deliberately
 * NOT in this map. Amount is now applied as a score multiplier via
 * AMOUNT_MULTIPLIER so it doesn't double-count against experience categories.
 * (Previously "small" mapped to "beginner", causing a collision where a rich
 * beginner with $4,999 was scored identically to a broke beginner.)
 */
export const ANSWER_WEIGHT_MAP: Record<string, WeightKey> = {
  // Q1: Goal
  crypto: "crypto",
  trade: "advanced",
  income: "low_fee",
  grow: "beginner",
  property: "property",
  "property-reit": "property",
  "property-super": "smsf",
  super: "smsf",
  automate: "robo",
  // Experience
  beginner: "beginner",
  intermediate: "low_fee",
  pro: "advanced",
  // Priority / what matters most (DIY track Q5)
  fees: "low_fee",
  "lowest-fees": "low_fee",
  safety: "smsf",
  tools: "advanced",
  simple: "robo",
  handsfree: "robo",
  "ease-of-use": "beginner",
  "research-tools": "advanced",
  dividends: "low_fee",
  "super-options": "smsf",
  "coin-range": "crypto",
  "best-for-etfs": "low_fee",
};

/**
 * Amount multipliers — scale the total score by portfolio size.
 * Higher amounts → platform quality and feature depth matter more.
 * Lower amounts → accessibility and low fees matter more.
 * These multipliers are subtle: they shift rankings by ~10-20%, not dominate.
 */
export const AMOUNT_MULTIPLIER: Record<AmountKey, number> = {
  small: 0.9,
  medium: 1.0,
  large: 1.1,
  xlarge: 1.2,
  // "whale" is the fallback quiz key for $100k+ — same multiplier as xlarge
  whale: 1.2,
};

export function scoreQuizResults(
  answers: string[],
  weights: Record<string, QuizWeights>,
  brokers: Broker[],
  quizCampaignWinners: { broker_slug: string }[] = [],
  amount?: AmountKey,
  goal?: string,
): ScoredResult[] {
  const multiplier = amount ? (AMOUNT_MULTIPLIER[amount] ?? 1.0) : 1.0;

  const scored = Object.entries(weights).map(([slug, scores]) => {
    let total = 0;

    answers.forEach((key) => {
      const weightKey = ANSWER_WEIGHT_MAP[key];
      if (weightKey) {
        total += scores[weightKey] || 0;
      }
      // Amount keys are intentionally not in ANSWER_WEIGHT_MAP — they never add
      // to category weights, preventing the beginner/amount collision bug.
    });

    // Apply amount multiplier AFTER summing category weights
    total *= multiplier;

    const broker = brokers.find((b) => b.slug === slug);
    if (broker?.rating) total *= 1 + (broker.rating - 4) * 0.1;

    return { slug, total, broker: broker || undefined };
  });

  // Tiebreaker: score DESC → rating DESC → name ASC
  scored.sort(
    (a, b) =>
      b.total - a.total ||
      (b.broker?.rating ?? 0) - (a.broker?.rating ?? 0) ||
      (a.broker?.name ?? "").localeCompare(b.broker?.name ?? "")
  );

  // Subtle sponsor boost: featured_partner in positions 1-5 gets swapped up 1.
  // Vertical-aware — when `goal` is set, only sponsored brokers applicable to
  // the user's stated goal can be boosted (no crypto-sponsor over super result).
  const boosted = applyQuizSponsorBoost(scored, 1, 5, goal);

  // Marketplace campaign boost: quiz-boost winner in 1-5 gets swapped up 1
  if (quizCampaignWinners.length > 0) {
    const campaignSlugs = new Set(
      quizCampaignWinners.map((w) => w.broker_slug)
    );
    const campaignIdx = boosted.findIndex(
      (r, i) => i >= 1 && i <= 5 && r.broker && campaignSlugs.has(r.broker.slug)
    );
    if (campaignIdx > 0) {
      const temp = boosted[campaignIdx];
      boosted[campaignIdx] = boosted[campaignIdx - 1];
      boosted[campaignIdx - 1] = temp;
    }
  }

  return boosted.slice(0, 3);
}
