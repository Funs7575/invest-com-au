import type { Broker } from "./types";
import { applyQuizSponsorBoost } from "./sponsorship";

export type WeightKey = "beginner" | "low_fee" | "us_shares" | "smsf" | "crypto" | "advanced";
export type QuizWeights = Record<WeightKey, number>;

export interface ScoredResult {
  slug: string;
  total: number;
  broker: Broker | null;
}

export const ANSWER_WEIGHT_MAP: Record<string, WeightKey> = {
  crypto: "crypto",
  trade: "advanced",
  income: "low_fee",
  grow: "beginner",
  beginner: "beginner",
  intermediate: "low_fee",
  pro: "advanced",
  small: "beginner",
  medium: "low_fee",
  large: "us_shares",
  whale: "advanced",
  fees: "low_fee",
  safety: "beginner",
  tools: "advanced",
  simple: "beginner",
};

export function scoreQuizResults(
  answers: string[],
  weights: Record<string, QuizWeights>,
  brokers: Broker[],
  quizCampaignWinners: { broker_slug: string }[] = []
): ScoredResult[] {
  const scored = Object.entries(weights).map(([slug, scores]) => {
    let total = 0;

    answers.forEach((key) => {
      const weightKey = ANSWER_WEIGHT_MAP[key] || "beginner";
      total += scores[weightKey] || 0;
    });

    const broker = brokers.find((b) => b.slug === slug);
    if (broker?.rating) total *= 1 + (broker.rating - 4) * 0.1;

    return { slug, total, broker: broker || null };
  });

  // Tiebreaker: sort by score DESC, then rating DESC, then name ASC
  scored.sort(
    (a, b) =>
      b.total - a.total ||
      (b.broker?.rating ?? 0) - (a.broker?.rating ?? 0) ||
      (a.broker?.name ?? "").localeCompare(b.broker?.name ?? "")
  );

  // Apply subtle sponsor boost: a featured_partner in positions 1-5
  // gets swapped up by 1 position (preserves trust -- max 1 slot)
  let boosted = applyQuizSponsorBoost(scored, 1, 5);

  // Apply marketplace campaign boost: if a quiz-boost campaign winner
  // exists in the scored list (positions 1-5), swap them up by 1 position
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
