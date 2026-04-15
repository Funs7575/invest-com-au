/**
 * Broker data change auto-approval classifier.
 *
 * Brokers submit edits to their profile via the broker portal and
 * every change currently needs manual admin approval. Most changes
 * are trivial (logo update, description wording) but get queued
 * alongside genuinely sensitive changes (fees, CTA, affiliate URL).
 *
 * This classifier tiers each change by risk so low-risk edits auto-
 * apply immediately while high-risk ones stay in the admin queue.
 *
 * Risk tiers:
 *   - `auto_apply`    — cosmetic text/image changes. Apply instantly.
 *   - `auto_apply_reviewable` — mid-risk. Apply immediately but admin
 *                               can revert within 24 hours.
 *   - `require_admin` — high-risk. Stays in queue as before.
 */

export type ChangeRiskTier =
  | "auto_apply"
  | "auto_apply_reviewable"
  | "require_admin";

// Fields that are purely cosmetic — can be auto-applied with no
// review. Typos, rewording, images, social links.
const AUTO_APPLY_FIELDS: readonly string[] = [
  "description",
  "tagline",
  "long_description",
  "logo_url",
  "banner_url",
  "facebook_url",
  "twitter_url",
  "linkedin_url",
  "youtube_url",
  "instagram_url",
  "office_address",
  "office_phone",
  "support_email",
  "support_hours",
  "mission_statement",
  "founded_year",
  "employee_count",
];

// Medium-risk fields that affect how the broker appears in
// comparisons but aren't directly money-sensitive.
const AUTO_APPLY_REVIEWABLE_FIELDS: readonly string[] = [
  "platform_type",
  "smsf_support",
  "chess_sponsored",
  "is_crypto",
  "specialty_tags",
  "supported_markets",
  "min_deposit",
  "onboarding_url",
];

// High-risk fields — fees, money, status, CTAs, affiliate links.
// Anything on this list stays in the admin queue.
const REQUIRE_ADMIN_FIELDS: readonly string[] = [
  "asx_fee",
  "asx_fee_value",
  "us_fee",
  "us_fee_value",
  "fx_rate",
  "affiliate_url",
  "cta_text",
  "benefit_cta",
  "deal",
  "deal_text",
  "deal_expiry",
  "status",
  "rating",
  "sponsorship_tier",
  "promoted_placement",
  "cpa_value",
  "editors_pick",
];

export interface BrokerDataChangeInput {
  field: string;
  old_value: unknown;
  new_value: unknown;
}

export interface BrokerDataChangeClassification {
  field: string;
  tier: ChangeRiskTier;
  reason: string;
}

export function classifyBrokerDataChange(
  input: BrokerDataChangeInput,
): BrokerDataChangeClassification {
  const { field } = input;

  if (REQUIRE_ADMIN_FIELDS.includes(field)) {
    return {
      field,
      tier: "require_admin",
      reason: "money_or_compliance_sensitive_field",
    };
  }

  if (AUTO_APPLY_REVIEWABLE_FIELDS.includes(field)) {
    return {
      field,
      tier: "auto_apply_reviewable",
      reason: "affects_comparison_but_not_money",
    };
  }

  if (AUTO_APPLY_FIELDS.includes(field)) {
    return {
      field,
      tier: "auto_apply",
      reason: "cosmetic_field",
    };
  }

  // Unknown field → default conservative path
  return {
    field,
    tier: "require_admin",
    reason: "unknown_field_default_admin_review",
  };
}

/**
 * Classify a batch of changes in a single submission and return the
 * most-restrictive tier across them. A submission touching BOTH
 * `description` (auto_apply) AND `asx_fee` (require_admin) gets
 * `require_admin` so the whole batch is human-reviewed rather than
 * splitting it across two approval paths.
 */
export function classifyChangeSet(
  inputs: BrokerDataChangeInput[],
): {
  overallTier: ChangeRiskTier;
  perField: BrokerDataChangeClassification[];
} {
  const perField = inputs.map(classifyBrokerDataChange);

  const hasRequireAdmin = perField.some((c) => c.tier === "require_admin");
  const hasReviewable = perField.some((c) => c.tier === "auto_apply_reviewable");

  const overallTier: ChangeRiskTier =
    hasRequireAdmin ? "require_admin" :
    hasReviewable ? "auto_apply_reviewable" :
    "auto_apply";

  return { overallTier, perField };
}
