import type { Broker } from "./types";
import { applyQuizSponsorBoost } from "./sponsorship";

export type WeightKey = "beginner" | "low_fee" | "us_shares" | "smsf" | "crypto" | "advanced" | "property" | "robo";
export type QuizWeights = Record<WeightKey, number>;
export type AmountKey = "small" | "medium" | "large" | "xlarge" | "whale";

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
  amount?: AmountKey
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

  // Subtle sponsor boost: featured_partner in positions 1-5 gets swapped up 1
  const boosted = applyQuizSponsorBoost(scored, 1, 5);

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
