/**
 * Advisor churn prediction.
 *
 * Rule-based scorer that looks at an advisor's recent activity
 * and emits a 0-100 churn risk plus a bucket. Writes to
 * `churn_scores`. Same pluggable structure as fraud-detection
 * so a learned model can slot in later.
 *
 * Buckets:
 *   low    (<20)  — healthy, not at risk
 *   watch  (20-60) — trending down, worth a nudge
 *   high   (>60)  — very likely to churn next 30 days
 *
 * Signals used (additive):
 *   - days since last login (0 → 0, 60+ → full)
 *   - drop in lead acceptance over the last 30d vs. previous 30d
 *   - recent dispute rate
 *   - credit balance trend (dropping to zero without topping up)
 *   - health score trend (falling fast)
 */

export type ChurnBucket = "low" | "watch" | "high";

export interface ChurnInputs {
  daysSinceLogin: number;
  leadAcceptance30d: number; // 0-1
  leadAcceptancePrior30d: number | null;
  disputeRate30d: number; // 0-1
  creditBalanceCents: number;
  creditBalancePrior30dCents: number | null;
  healthScore: number | null; // 0-100
  healthScoreDelta30d: number | null; // negative = worse
  daysAsAdvisor: number;
}

export interface ChurnResult {
  score: number; // 0-100
  bucket: ChurnBucket;
  reasons: Array<{ factor: string; points: number; note: string }>;
}

/**
 * Pure scorer. Exported so tests cover every branch without DB.
 */
export function scoreChurnRisk(inputs: ChurnInputs): ChurnResult {
  const reasons: Array<{ factor: string; points: number; note: string }> = [];
  let total = 0;
  function add(factor: string, points: number, note: string) {
    if (points === 0) return;
    reasons.push({ factor, points: Math.round(points), note });
    total += points;
  }

  // Login recency
  if (inputs.daysSinceLogin >= 60) {
    add("stale_login", 30, `Hasn't logged in for ${inputs.daysSinceLogin} days`);
  } else if (inputs.daysSinceLogin >= 30) {
    add("stale_login", 15, `Last login ${inputs.daysSinceLogin} days ago`);
  } else if (inputs.daysSinceLogin >= 14) {
    add("stale_login", 5, `Last login ${inputs.daysSinceLogin} days ago`);
  }

  // Lead acceptance drop
  if (
    inputs.leadAcceptancePrior30d != null &&
    inputs.leadAcceptancePrior30d > 0
  ) {
    const drop =
      inputs.leadAcceptancePrior30d - inputs.leadAcceptance30d;
    if (drop > 0.3) add("accept_drop", 20, `Acceptance fell ${Math.round(drop * 100)} points`);
    else if (drop > 0.1) add("accept_drop", 10, `Acceptance fell ${Math.round(drop * 100)} points`);
  }

  // Dispute rate
  if (inputs.disputeRate30d > 0.15) {
    add("dispute_rate", 15, `Recent dispute rate ${Math.round(inputs.disputeRate30d * 100)}%`);
  } else if (inputs.disputeRate30d > 0.05) {
    add("dispute_rate", 5, `Recent dispute rate ${Math.round(inputs.disputeRate30d * 100)}%`);
  }

  // Credit balance trend
  if (inputs.creditBalanceCents <= 0 && inputs.daysAsAdvisor > 30) {
    add("credit_zero", 15, "Credit balance dropped to zero");
  } else if (
    inputs.creditBalancePrior30dCents != null &&
    inputs.creditBalancePrior30dCents > inputs.creditBalanceCents * 2 &&
    inputs.creditBalanceCents >= 0
  ) {
    add("credit_falling", 10, "Credit balance trending down without top-ups");
  }

  // Health score
  if (inputs.healthScore != null && inputs.healthScore < 40) {
    add("low_health", 15, `Health score ${inputs.healthScore}/100`);
  } else if (inputs.healthScore != null && inputs.healthScore < 60) {
    add("mid_health", 5, `Health score ${inputs.healthScore}/100`);
  }
  if (inputs.healthScoreDelta30d != null && inputs.healthScoreDelta30d <= -15) {
    add("health_falling", 10, `Health score down ${Math.abs(inputs.healthScoreDelta30d)} points in 30 days`);
  }

  const score = Math.max(0, Math.min(100, Math.round(total)));
  const bucket: ChurnBucket =
    score >= 60 ? "high" : score >= 20 ? "watch" : "low";
  return { score, bucket, reasons };
}
