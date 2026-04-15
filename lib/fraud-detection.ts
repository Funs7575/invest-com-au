/**
 * Fraud / abuse scoring for user-generated content.
 *
 * Pure scoring library — take a set of signals, emit a 0-100
 * suspiciousness score + feature contributions + a verdict bucket.
 * A nightly cron runs this over new reviews / advisors / disputes
 * and writes to `fraud_signals`.
 *
 * Starts rule-based — we're not shipping a learned model in this
 * wave. The `signals` JSON field stores contributing features so
 * a future supervised model can use this data as labels.
 */

export type FraudEntityType =
  | "user_review"
  | "professional_review"
  | "advisor"
  | "lead_dispute";

export type FraudVerdict = "clean" | "suspicious" | "fraud";

export interface FraudFeatures {
  /** Velocity — entities from the same author/ip in the last 24h */
  authorVelocity24h?: number;
  /** IP/email/address has previously been flagged */
  priorFlags?: number;
  /** Content is very short (rushed / template) */
  contentLength?: number;
  /** Star rating is extreme (1 or 5) */
  ratingIsExtreme?: boolean;
  /** Duplicate body / boilerplate overlap with other recent reviews */
  duplicateBodyHits?: number;
  /** Author has an unusually short account age */
  authorAgeDays?: number;
  /** Fresh email domain (disposable / throwaway) */
  disposableEmail?: boolean;
  /** Reviewer's prior verified purchases or checked leads */
  authorPriorVerified?: number;
  /** Sentiment misalignment — 5 stars but negative text (or vice versa) */
  sentimentMismatch?: boolean;
}

export interface FraudScore {
  score: number; // 0-100
  verdict: FraudVerdict;
  signals: Array<{ feature: string; weight: number; contribution: number }>;
  reason: string;
}

/**
 * Weighted feature contributions. Each returns a 0-1 "how bad"
 * then multiplied by the weight. Total is clamped to 0-100.
 */
const FEATURE_WEIGHTS: Record<string, number> = {
  authorVelocity24h: 35, // 10+ per 24h → strong signal
  priorFlags: 40,
  contentLength: 20,
  ratingIsExtreme: 5,
  duplicateBodyHits: 30,
  authorAgeDays: 20,
  disposableEmail: 30,
  sentimentMismatch: 10,
  authorPriorVerified: -20, // negative weight = protective
};

/**
 * Pure scorer. Returns 0-100 with signals.
 */
export function scoreFraud(features: FraudFeatures): FraudScore {
  const signals: Array<{ feature: string; weight: number; contribution: number }> = [];
  let total = 0;

  function add(feature: string, ratio: number) {
    const weight = FEATURE_WEIGHTS[feature] || 0;
    const contribution = Math.max(-100, Math.min(100, weight * ratio));
    signals.push({ feature, weight, contribution: Math.round(contribution * 100) / 100 });
    total += contribution;
  }

  if (features.authorVelocity24h != null) {
    // 0 → 0, 3 → 0.3, 10 → 1 (cap)
    const ratio = Math.min(1, features.authorVelocity24h / 10);
    add("authorVelocity24h", ratio);
  }
  if (features.priorFlags != null && features.priorFlags > 0) {
    add("priorFlags", Math.min(1, features.priorFlags / 3));
  }
  if (features.contentLength != null) {
    // 0-15 chars → strong suspicion, 16-60 → mild, 60+ → none
    if (features.contentLength < 15) add("contentLength", 1);
    else if (features.contentLength < 60) add("contentLength", 0.3);
  }
  if (features.ratingIsExtreme) add("ratingIsExtreme", 1);
  if (features.duplicateBodyHits != null && features.duplicateBodyHits > 0) {
    add("duplicateBodyHits", Math.min(1, features.duplicateBodyHits / 3));
  }
  if (features.authorAgeDays != null) {
    // 0 days → 1, 30 days → 0
    const ratio = Math.max(0, 1 - features.authorAgeDays / 30);
    if (ratio > 0) add("authorAgeDays", ratio);
  }
  if (features.disposableEmail) add("disposableEmail", 1);
  if (features.sentimentMismatch) add("sentimentMismatch", 1);
  if (features.authorPriorVerified != null && features.authorPriorVerified > 0) {
    // Protective factor — subtract points for an established author
    add("authorPriorVerified", Math.min(1, features.authorPriorVerified / 3));
  }

  const clamped = Math.max(0, Math.min(100, Math.round(total)));
  const verdict: FraudVerdict =
    clamped >= 70 ? "fraud" : clamped >= 40 ? "suspicious" : "clean";

  const topSignals = [...signals]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3)
    .map((s) => `${s.feature}:${s.contribution > 0 ? "+" : ""}${s.contribution}`)
    .join(", ");

  return {
    score: clamped,
    verdict,
    signals,
    reason: topSignals || "no strong signals",
  };
}
