/**
 * Open to Offers — local row + domain types.
 *
 * These mirror the columns added by
 * `supabase/migrations/20260612222000_prospect_pool.sql`. They live here (NOT
 * in lib/database.types.ts) deliberately — database.types.ts is generated and
 * the feature is dormant behind the `open_to_offers` flag, so we keep its types
 * local until the table is part of the live schema.
 */

/** Budget bands as stored on investor_profiles (the canonical consumer band). */
export type ProspectBudgetBand = "small" | "medium" | "large" | "whale";

/** Display labels for the four budget bands, banded (never exact figures). */
export const BUDGET_BAND_LABELS: Record<ProspectBudgetBand, string> = {
  small: "Up to ~$100k",
  medium: "~$100k–$500k",
  large: "~$500k–$2M",
  whale: "$2M+",
};

/** Timeline / urgency buckets (find-advisor quiz canonical ids). */
export type ProspectTimeline = "asap" | "weeks" | "research";

export const TIMELINE_LABELS: Record<ProspectTimeline, string> = {
  asap: "As soon as possible",
  weeks: "In the next month or two",
  research: "Researching for now",
};

export type ProspectExperience = "beginner" | "intermediate" | "pro";

/**
 * The ANONYMISED prospect snapshot. This is the EXACT set of fields that may be
 * serialised into prospect_pool.snapshot. Every field here is non-identifying.
 *
 * HARD RULE: no name, email, phone, postcode, suburb, full address, IP, or any
 * free-text the consumer typed. State is the finest location granularity (the
 * same granularity the masked brief inbox already shows). Budget is a band, not
 * a figure. lib/prospect-pool/snapshot.ts builds this and a scrubber asserts no
 * banned key escapes.
 */
export interface ProspectSnapshot {
  /** Advisor type/need slug (quiz-advisor-types AdvisorNeed), e.g. "smsf-accountant". */
  advisorType: string | null;
  /** Human label for the advisor type, e.g. "SMSF Accountant". */
  advisorTypeLabel: string | null;
  /** Plain-language goal/intent summary, e.g. "Set up an SMSF". */
  goal: string | null;
  /** Australian state code only — NSW/VIC/QLD/WA/SA/TAS/ACT/NT. Never finer. */
  state: string | null;
  /** Budget BAND only. */
  budgetBand: ProspectBudgetBand | null;
  /** Timeline / urgency bucket. */
  timeline: ProspectTimeline | null;
  /** Experience level (non-identifying). */
  experience: ProspectExperience | null;
  /** True when the consumer flagged cross-border / expat context. */
  crossBorder: boolean;
  /** Primary vertical (content taxonomy), e.g. "property". Non-identifying. */
  vertical: string | null;
  /** ISO timestamp the snapshot was built (for freshness display). */
  builtAt: string;
}

export type ProspectStatus = "active" | "paused" | "expired";

export interface ProspectPoolRow {
  id: string;
  user_id: string;
  snapshot: ProspectSnapshot;
  status: ProspectStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PitchStatus = "pending" | "accepted" | "declined" | "expired";

export interface AdvisorPitchRow {
  id: string;
  prospect_id: string;
  professional_id: number;
  body: string;
  fee_band: string | null;
  credits_cost: number;
  status: PitchStatus;
  brief_id: number | null;
  created_at: string;
  decided_at: string | null;
}

/** How long a prospect stays in the pool before needing renewal. */
export const PROSPECT_TTL_DAYS = 60;

/** Max pitches a single prospect may receive in a rolling 30-day window. */
export const MAX_PITCHES_PER_PROSPECT_PER_MONTH = 3;

/** Max characters in a pitch body (matches the DB CHECK). */
export const PITCH_BODY_MAX_LENGTH = 300;

/**
 * Anonymised prospect card the adviser sees in the Prospects tab. Carries the
 * snapshot + the opaque prospect id + non-identifying freshness. NEVER the
 * user_id (that would let an adviser correlate across features) — the API maps
 * pitch writes by prospect id server-side.
 */
export interface ProspectCard {
  prospectId: string;
  snapshot: ProspectSnapshot;
  /** ISO timestamp the prospect joined the pool (coarse recency only). */
  listedAt: string;
  /** True when THIS adviser has already pitched this prospect (cap of 1). */
  alreadyPitched: boolean;
  /** True when this adviser was previously declined by this prospect (suppressed). */
  previouslyDeclined: boolean;
  /** Estimated credit cost for this adviser to pitch this prospect. */
  estimatedPitchCost: number;
}
