/**
 * Marketplace campaign auto-approval classifier.
 *
 * Brokers submit campaigns (banners, CPC placements, featured
 * placements) via the broker portal. Admin currently reviews each
 * one before it goes live. Most are routine: valid URL, existing
 * creative, within budget. This classifier tiers submissions so
 * obvious-clean ones auto-approve and only ambiguous ones queue
 * for human review.
 *
 * Pure function. Approve / escalate / reject verdicts.
 */

export type CampaignVerdict = "auto_approve" | "auto_reject" | "escalate";
export type CampaignConfidence = "high" | "medium" | "low";

export interface CampaignForClassifier {
  id: number;
  broker_slug: string;
  inventory_type: "featured" | "cpc" | string;
  budget_cents: number | null;
  start_date: string | null;
  end_date: string | null;
  creative_headline: string | null;
  creative_body: string | null;
  landing_url: string | null;
  cta_text: string | null;
  /** Whether this broker has an active broker_account in good standing */
  brokerAccountActive: boolean;
  /** Whether the landing URL domain matches the broker's registered domain(s) */
  landingDomainMatches: boolean;
  /** Whether the broker has sufficient wallet balance for the campaign budget */
  hasBudget: boolean;
  /** Count of campaigns this broker has had approved historically */
  priorApprovedCount: number;
  /** Count of campaigns this broker has had rejected historically */
  priorRejectedCount: number;
}

export interface CampaignResult {
  verdict: CampaignVerdict;
  confidence: CampaignConfidence;
  reasons: string[];
}

// Banned creative language — hard reject
const BANNED_CREATIVE_PATTERNS: RegExp[] = [
  /\bguaranteed\s+(returns?|profits?|\d+%)/i,
  /\brisk[\s-]free/i,
  /\bbeat\s+the\s+market/i,
  /\bno[\s-]fee\b(?!.*conditions)/i, // "no fees" without conditions qualifier
  /\binsider\s+tips?/i,
];

// Minimum budget for auto-approval — campaigns below this are usually
// test campaigns or operator error.
const MIN_BUDGET_CENTS = 10_000; // A$100

export function classifyCampaign(ctx: CampaignForClassifier): CampaignResult {
  const signals: string[] = [];

  // ── Hard rejects ────────────────────────────────────────
  if (!ctx.brokerAccountActive) {
    return {
      verdict: "auto_reject",
      confidence: "high",
      reasons: ["broker_account_not_active"],
    };
  }

  const creativeText = `${ctx.creative_headline || ""} ${ctx.creative_body || ""}`.toLowerCase();
  for (const pattern of BANNED_CREATIVE_PATTERNS) {
    if (pattern.test(creativeText)) {
      return {
        verdict: "auto_reject",
        confidence: "high",
        reasons: [`banned_creative_pattern:${pattern.source}`],
      };
    }
  }

  if (!ctx.landingDomainMatches && ctx.landing_url) {
    signals.push("landing_domain_mismatch");
  }

  if (ctx.budget_cents === null || ctx.budget_cents < MIN_BUDGET_CENTS) {
    signals.push(`budget_below_minimum:${ctx.budget_cents}`);
  }

  if (!ctx.hasBudget) {
    return {
      verdict: "auto_reject",
      confidence: "high",
      reasons: ["insufficient_wallet_balance"],
    };
  }

  if (ctx.priorRejectedCount >= 3) {
    signals.push(`prior_rejections:${ctx.priorRejectedCount}`);
    return {
      verdict: "escalate",
      confidence: "medium",
      reasons: signals,
    };
  }

  // ── Auto-approve path ───────────────────────────────────
  const cleanCreative = creativeText.trim().length > 0;
  const hasLandingUrl = !!ctx.landing_url;
  const domainOk = ctx.landingDomainMatches;
  const budgetOk = ctx.budget_cents !== null && ctx.budget_cents >= MIN_BUDGET_CENTS;
  const trustedBroker = ctx.priorApprovedCount >= 2;

  if (cleanCreative && hasLandingUrl && domainOk && budgetOk && trustedBroker) {
    return {
      verdict: "auto_approve",
      confidence: "high",
      reasons: ["clean_creative_trusted_broker_domain_match"],
    };
  }

  if (cleanCreative && hasLandingUrl && domainOk && budgetOk) {
    // First or second campaign from this broker — escalate for human eyes
    return {
      verdict: "escalate",
      confidence: "medium",
      reasons: ["first_or_second_campaign_from_broker", ...signals],
    };
  }

  return {
    verdict: "escalate",
    confidence: "low",
    reasons: ["missing_fields_or_domain_mismatch", ...signals],
  };
}
