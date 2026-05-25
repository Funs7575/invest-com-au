/**
 * lib/advisor-trust-score.ts
 *
 * Advisor Trust Score — a public-facing, methodology-transparent composite
 * score computed from factual credential and compliance signals on a
 * professional's profile.
 *
 * PURPOSE: Help consumers quickly understand an advisor's verifiable standing.
 *   This is NOT a recommendation, personal advice, or a "best advisor" ranking.
 *   It is a factual composite of objective, publicly-checkable data points.
 *   See /advisor/trust-score-methodology for the full published methodology.
 *
 * AFSL SAFETY NOTE: The score is based entirely on factual credential signals
 *   (AFSL/registration status, verified flag, tenure, profile completeness,
 *   and review volume/rating). It does not express an opinion on suitability,
 *   performance, returns, or quality of advice. Under RG 234 / RG 256 the
 *   site holds no AFSL and must not give personal advice or imply comparative
 *   superiority between advisors for the purposes of investment decisions.
 *
 * DESIGN: Pure function (no I/O). Input is a subset of the `professionals`
 *   row plus a review aggregate. Output is a fully-typed result with per-
 *   dimension sub-scores, labels, and an overall 0–100 score.
 */

/* ─── Named weight constants ─── */

/** Weight for the Verification & Registration dimension (0–1). */
export const WEIGHT_VERIFICATION = 0.30;
/** Weight for the Track Record (tenure) dimension (0–1). */
export const WEIGHT_TRACK_RECORD = 0.25;
/** Weight for the Profile Transparency dimension (0–1). */
export const WEIGHT_TRANSPARENCY = 0.25;
/** Weight for the Client Feedback dimension (0–1). */
export const WEIGHT_CLIENT_FEEDBACK = 0.20;

// Sanity check: weights must sum to 1.0 (tested)
// 0.30 + 0.25 + 0.25 + 0.20 = 1.00

/* ─── Dimension keys ─── */

export type TrustDimensionKey =
  | "verification"
  | "track_record"
  | "transparency"
  | "client_feedback";

/* ─── Public types ─── */

export interface TrustDimension {
  key: TrustDimensionKey;
  label: string;
  /** 0–100 sub-score for this dimension. */
  score: number;
  /** 0–1 weight applied to this dimension in the overall calculation. */
  weight: number;
  /** One-sentence plain-English explanation of what drove this score. */
  rationale: string;
  /** Markdown-safe description of what this dimension measures (shown in UI). */
  description: string;
}

export interface AdvisorTrustScore {
  /** Overall Trust Score, 0–100, rounded to nearest integer. */
  overall: number;
  /** Human-readable label corresponding to the overall score band. */
  label: string;
  /** CSS colour token for the label/gauge (tailwind class fragment). */
  labelColor: string;
  /** Per-dimension breakdown. */
  dimensions: TrustDimension[];
  /**
   * ISO-8601 timestamp at which the score was computed.
   * Set by the caller (page server component) so tests can stay pure.
   */
  computedAt: string;
}

/* ─── Input shape ─── */

/**
 * Subset of the `professionals` row that the scorer needs.
 * All fields that could be missing must be typed as `| null | undefined`.
 */
export interface AdvisorTrustScoreInput {
  // Verification & Registration
  verified: boolean | null | undefined;
  afsl_number: string | null | undefined;
  registration_number: string | null | undefined;
  verified_at: string | null | undefined;

  // Track Record (tenure proxy: created_at is the join date)
  created_at: string | null | undefined;
  years_experience: number | null | undefined;

  // Profile Transparency (completeness signals)
  bio: string | null | undefined;
  photo_url: string | null | undefined;
  qualifications: unknown[] | null | undefined;
  education: unknown[] | null | undefined;
  memberships: unknown[] | null | undefined;
  fee_structure: string | null | undefined;
  fee_description: string | null | undefined;
  linkedin_url: string | null | undefined;
  website: string | null | undefined;
  languages: unknown[] | null | undefined;

  // Client Feedback
  rating: number | null | undefined;
  review_count: number | null | undefined;
}

/* ─── Verification dimension ─── */

/**
 * Dimension 1 — Verification & Registration (weight 30%)
 *
 * Signals:
 *   - Verified flag (confirmed by editorial or ASIC check)   +50 pts
 *   - AFSL number present on profile                         +30 pts
 *   - Registration number present (AR, ACR, MARN, etc.)      +10 pts
 *   - Verified within last 12 months (freshness bonus)       +10 pts
 *
 * Max = 100. No signal = 0.
 */
function scoreVerification(input: AdvisorTrustScoreInput): TrustDimension {
  let score = 0;
  const signals: string[] = [];

  if (input.verified) {
    score += 50;
    signals.push("profile verified");
  }
  if (input.afsl_number && input.afsl_number.trim().length > 0) {
    score += 30;
    signals.push(`AFSL ${input.afsl_number.trim()} on file`);
  }
  if (input.registration_number && input.registration_number.trim().length > 0) {
    score += 10;
    signals.push("registration number on file");
  }
  // Freshness: verified within the past 12 months
  if (input.verified && input.verified_at) {
    const twelveMonthsAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const verifiedAt = new Date(input.verified_at).getTime();
    if (!isNaN(verifiedAt) && verifiedAt >= twelveMonthsAgo) {
      score += 10;
      signals.push("verified within past 12 months");
    }
  }

  const rationale =
    signals.length > 0
      ? `Score based on: ${signals.join(", ")}.`
      : "No credential verification signals found on this profile.";

  return {
    key: "verification",
    label: "Verification & Registration",
    score: Math.min(score, 100),
    weight: WEIGHT_VERIFICATION,
    rationale,
    description:
      "Checks whether the advisor has been independently verified by the Invest.com.au editorial team, " +
      "holds an Australian Financial Services Licence (AFSL) number, or carries a relevant registration " +
      "number (e.g. Authorised Representative, Credit Representative, or MARN). " +
      "Verification is cross-checked against ASIC Professional Registers.",
  };
}

/* ─── Track Record dimension ─── */

/**
 * Dimension 2 — Track Record (weight 25%)
 *
 * Signals (using the higher of: self-reported years_experience, or
 * platform tenure derived from created_at):
 *
 *   ≥ 15 years → 100
 *   ≥ 10 years → 85
 *   ≥  7 years → 70
 *   ≥  5 years → 55
 *   ≥  3 years → 40
 *   ≥  1 year  → 25
 *   < 1 year / no data → 10
 */
function scoreTrackRecord(input: AdvisorTrustScoreInput): TrustDimension {
  // Derive platform tenure in years from created_at
  let tenureYears: number | null = null;
  if (input.created_at) {
    const createdMs = new Date(input.created_at).getTime();
    if (!isNaN(createdMs)) {
      tenureYears = (Date.now() - createdMs) / (365.25 * 24 * 60 * 60 * 1000);
    }
  }

  // Use the higher of self-reported experience vs platform tenure
  const selfReported =
    typeof input.years_experience === "number" && input.years_experience > 0
      ? input.years_experience
      : null;

  const effectiveYears: number | null =
    selfReported != null && tenureYears != null
      ? Math.max(selfReported, tenureYears)
      : (selfReported ?? tenureYears);

  let score: number;
  let rationale: string;

  if (effectiveYears == null) {
    score = 10;
    rationale = "No tenure or experience data available.";
  } else if (effectiveYears >= 15) {
    score = 100;
    rationale = `15+ years of experience or platform tenure (${effectiveYears.toFixed(1)} yrs).`;
  } else if (effectiveYears >= 10) {
    score = 85;
    rationale = `10–14 years of experience or platform tenure (${effectiveYears.toFixed(1)} yrs).`;
  } else if (effectiveYears >= 7) {
    score = 70;
    rationale = `7–9 years of experience or platform tenure (${effectiveYears.toFixed(1)} yrs).`;
  } else if (effectiveYears >= 5) {
    score = 55;
    rationale = `5–6 years of experience or platform tenure (${effectiveYears.toFixed(1)} yrs).`;
  } else if (effectiveYears >= 3) {
    score = 40;
    rationale = `3–4 years of experience or platform tenure (${effectiveYears.toFixed(1)} yrs).`;
  } else if (effectiveYears >= 1) {
    score = 25;
    rationale = `1–2 years of experience or platform tenure (${effectiveYears.toFixed(1)} yrs).`;
  } else {
    score = 10;
    rationale = `Less than 1 year on the platform or limited experience data.`;
  }

  return {
    key: "track_record",
    label: "Track Record",
    score,
    weight: WEIGHT_TRACK_RECORD,
    rationale,
    description:
      "Reflects the advisor's verified tenure on the Invest.com.au platform and/or their self-reported " +
      "years of professional experience. Longer track records provide more observable data for consumers. " +
      "The higher of the two signals is used. This is a tenure signal only — it does not imply performance.",
  };
}

/* ─── Transparency dimension ─── */

/**
 * Dimension 3 — Profile Transparency (weight 25%)
 *
 * Points awarded for each populated transparency field:
 *   bio (long-form text)         20 pts
 *   photo                        15 pts
 *   qualifications list          15 pts
 *   fee structure / description  15 pts
 *   education history            10 pts
 *   memberships                  10 pts
 *   online presence (linked in or website) 10 pts
 *   languages                     5 pts
 *
 * Max = 100.
 */
function scoreTransparency(input: AdvisorTrustScoreInput): TrustDimension {
  const checks: Array<{ label: string; pts: number; present: boolean }> = [
    {
      label: "bio",
      pts: 20,
      present:
        typeof input.bio === "string" && input.bio.trim().length > 30,
    },
    {
      label: "photo",
      pts: 15,
      present:
        typeof input.photo_url === "string" && input.photo_url.trim().length > 0,
    },
    {
      label: "qualifications",
      pts: 15,
      present: Array.isArray(input.qualifications) && input.qualifications.length > 0,
    },
    {
      label: "fee structure",
      pts: 15,
      present:
        (typeof input.fee_structure === "string" &&
          input.fee_structure.trim().length > 0) ||
        (typeof input.fee_description === "string" &&
          input.fee_description.trim().length > 0),
    },
    {
      label: "education",
      pts: 10,
      present: Array.isArray(input.education) && input.education.length > 0,
    },
    {
      label: "professional memberships",
      pts: 10,
      present: Array.isArray(input.memberships) && input.memberships.length > 0,
    },
    {
      label: "online presence",
      pts: 10,
      present:
        (typeof input.linkedin_url === "string" &&
          input.linkedin_url.trim().length > 0) ||
        (typeof input.website === "string" && input.website.trim().length > 0),
    },
    {
      label: "languages",
      pts: 5,
      present: Array.isArray(input.languages) && input.languages.length > 1,
    },
  ];

  const earned = checks
    .filter((c) => c.present)
    .map((c) => c.label);
  const score = checks.reduce((sum, c) => (c.present ? sum + c.pts : sum), 0);

  const rationale =
    earned.length > 0
      ? `Present: ${earned.join(", ")}.`
      : "No transparency fields populated.";

  return {
    key: "transparency",
    label: "Profile Transparency",
    score: Math.min(score, 100),
    weight: WEIGHT_TRANSPARENCY,
    rationale,
    description:
      "Measures how much factual information the advisor has published on their public profile: " +
      "biography, photo, qualifications, fee structure, education history, professional memberships, " +
      "online presence (LinkedIn / website), and languages spoken. " +
      "More disclosure lets consumers make better-informed decisions.",
  };
}

/* ─── Client Feedback dimension ─── */

/**
 * Dimension 4 — Client Feedback (weight 20%)
 *
 * Combined volume × quality signal to avoid gaming via a few hand-picked reviews.
 *
 * Volume score (50% of dimension):
 *   ≥ 20 reviews → 100
 *   ≥ 10 reviews →  80
 *   ≥  5 reviews →  60
 *   ≥  2 reviews →  40
 *   ≥  1 review  →  20
 *   0 reviews    →   0
 *
 * Quality score (50% of dimension):
 *   Maps the star rating (0–5) linearly onto 0–100 but only from the range
 *   [3.0, 5.0] so that < 3.0 yields 0 and = 5.0 yields 100.
 *   Rationale: on this platform ratings below 3.0 are practically impossible
 *   (clients who had genuinely bad experiences tend to leave no review, so
 *   sub-3.0 averages are statistically significant).
 *
 * No reviews → both halves = 0.
 */
function scoreClientFeedback(input: AdvisorTrustScoreInput): TrustDimension {
  const count = typeof input.review_count === "number" ? input.review_count : 0;
  const rating = typeof input.rating === "number" ? input.rating : null;

  // Volume sub-score
  let volumeScore: number;
  if (count >= 20) volumeScore = 100;
  else if (count >= 10) volumeScore = 80;
  else if (count >= 5) volumeScore = 60;
  else if (count >= 2) volumeScore = 40;
  else if (count >= 1) volumeScore = 20;
  else volumeScore = 0;

  // Quality sub-score
  let qualityScore: number;
  if (rating == null || count === 0) {
    qualityScore = 0;
  } else {
    // Linear map [3.0, 5.0] → [0, 100], clamp to [0, 100]
    qualityScore = Math.max(0, Math.min(100, ((rating - 3.0) / 2.0) * 100));
  }

  const score = Math.round((volumeScore + qualityScore) / 2);

  let rationale: string;
  if (count === 0) {
    rationale = "No reviews on this profile yet.";
  } else {
    rationale = `${count} review${count === 1 ? "" : "s"}, ${rating != null ? `${rating.toFixed(1)}/5.0 average rating` : "no rating"}.`;
  }

  return {
    key: "client_feedback",
    label: "Client Feedback",
    score,
    weight: WEIGHT_CLIENT_FEEDBACK,
    rationale,
    description:
      "Combines the number of approved client reviews (volume signal) with the average star rating " +
      "(quality signal). Both components carry equal weight within this dimension. " +
      "Reviews are moderated before publication and are not editable by the advisor.",
  };
}

/* ─── Label helpers ─── */

/**
 * Returns a human-readable label for the given overall score.
 * Bands mirror the broker health-score convention.
 */
export function trustScoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Good";
  if (score >= 50) return "Moderate";
  return "Limited";
}

/**
 * Returns the Tailwind text-colour class for the given score band.
 */
export function trustScoreLabelColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-slate-500";
}

/* ─── Main export ─── */

/**
 * Compute the Advisor Trust Score from a professionals row + review aggregate.
 *
 * Pure function — no I/O, no side effects.
 *
 * @param input  Subset of the `professionals` DB row (typed as
 *               `AdvisorTrustScoreInput` — callers may pass the full row).
 * @param computedAt  ISO-8601 timestamp for the computation time.
 *                    Defaults to `new Date().toISOString()` when omitted.
 */
export function computeAdvisorTrustScore(
  input: AdvisorTrustScoreInput,
  computedAt?: string,
): AdvisorTrustScore {
  const dimensions: TrustDimension[] = [
    scoreVerification(input),
    scoreTrackRecord(input),
    scoreTransparency(input),
    scoreClientFeedback(input),
  ];

  // Weighted average — weights already sum to 1.0
  const overall = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
  );

  return {
    overall,
    label: trustScoreLabel(overall),
    labelColor: trustScoreLabelColor(overall),
    dimensions,
    computedAt: computedAt ?? new Date().toISOString(),
  };
}
