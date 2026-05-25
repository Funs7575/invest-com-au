/**
 * Rate-ingest core — pure, tested data-layer helpers.
 *
 * This module owns:
 *   1. Shared types for savings and loan rate rows (mirroring the DB schema).
 *   2. Row-level validation with sane bounds (no DB round-trip required).
 *   3. Staleness / freshness computations: daysSinceUpdate, isStale, formatAge.
 *   4. A source-adapter interface so the two cron routes can switch between
 *      real external feeds (when a credential env-var is present) and the
 *      existing admin-imported DB rows (always available as a fallback).
 *
 * Nothing in here touches the DB directly — I/O belongs in the cron routes
 * and the DB-adapter implementations. All functions are pure and fully tested.
 *
 * AFSL note: this module performs factual data operations only. It does not
 * generate, rank, or recommend financial products. It is a pipeline helper.
 */

import { logger } from "@/lib/logger";

const log = logger("rate-ingest");

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Number of days after which a rate row is considered stale.
 * Loan rates change slowly; 7 days is a conservative but safe threshold.
 */
export const LOAN_RATE_STALE_DAYS = 7;

/**
 * Savings rates can change more frequently (e.g. RBA decisions).
 * 3 days triggers a staleness flag; admin should re-import or feed should fire.
 */
export const SAVINGS_RATE_STALE_DAYS = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape of a validated savings-rate row (post-import from any source). */
export interface SavingsRateRow {
  broker_id: number;
  product_kind: "savings_account" | "term_deposit";
  /** Headline rate in basis points (525 = 5.25% p.a.). */
  rate_bps: number;
  intro_rate_bps: number | null;
  intro_term_months: number | null;
  min_balance_cents: number;
  max_balance_cents: number | null;
  term_months: number | null;
  source: "manual" | "scraped" | "partner_feed";
  notes: string;
}

/** Shape of a validated loan-rate row. */
export interface LoanRateRow {
  lender_slug: string;
  lender_name: string;
  /** Rate as a numeric percentage (6.49). */
  rate_pct: number;
  comparison_rate_pct: number;
  max_lvr: number;
  interest_only: boolean;
  offset_available: boolean;
  min_loan_cents: number;
  apply_url: string;
}

/** Validation outcome. ok=true → row is safe to upsert. */
export type ValidationResult<T> =
  | { ok: true; row: T }
  | { ok: false; reason: string };

/** Source identifier stored on persisted rows / logged in cron stats. */
export type RateSource = "admin_db" | "partner_feed" | "scraped";

/** What the adapter returns after fetching from its upstream. */
export interface AdapterResult<T> {
  rows: T[];
  source: RateSource;
}

/** Pluggable adapter interface for a single rate source. */
export interface RateSourceAdapter<T> {
  /**
   * Attempt to fetch rows. Must NOT throw — catch internally and return
   * `{ rows: [], source }` so the caller can fall back gracefully.
   */
  fetch(): Promise<AdapterResult<T>>;
}

// ─── Validation ──────────────────────────────────────────────────────────────

const PRODUCT_KINDS = new Set<string>(["savings_account", "term_deposit"]);
const SAVINGS_SOURCES = new Set<string>(["manual", "scraped", "partner_feed"]);

/**
 * Validate a raw savings-rate row against sane bounds. Does NOT hit the DB.
 * Mirrors the constraints in 20260518040000_savings_rate_snapshots.sql.
 */
export function validateSavingsRateRow(
  raw: Partial<SavingsRateRow>,
): ValidationResult<SavingsRateRow> {
  if (typeof raw.broker_id !== "number" || !Number.isInteger(raw.broker_id) || raw.broker_id <= 0) {
    return { ok: false, reason: "broker_id must be a positive integer" };
  }

  if (!raw.product_kind || !PRODUCT_KINDS.has(raw.product_kind)) {
    return { ok: false, reason: `product_kind must be one of ${[...PRODUCT_KINDS].join(", ")}` };
  }

  if (typeof raw.rate_bps !== "number" || !Number.isInteger(raw.rate_bps) || raw.rate_bps < 0 || raw.rate_bps > 5000) {
    return { ok: false, reason: "rate_bps must be an integer in [0, 5000] (max 50.00%)" };
  }

  // Intro-rate consistency: both or neither (matches DB CHECK constraint).
  const hasIntroRate = raw.intro_rate_bps != null;
  const hasIntroTerm = raw.intro_term_months != null;
  if (hasIntroRate !== hasIntroTerm) {
    return { ok: false, reason: "intro_rate_bps and intro_term_months must both be set or both null" };
  }

  if (hasIntroRate) {
    if (
      typeof raw.intro_rate_bps !== "number" ||
      !Number.isInteger(raw.intro_rate_bps) ||
      raw.intro_rate_bps < 0 ||
      raw.intro_rate_bps > 5000
    ) {
      return { ok: false, reason: "intro_rate_bps must be an integer in [0, 5000]" };
    }
    if (
      typeof raw.intro_term_months !== "number" ||
      !Number.isInteger(raw.intro_term_months) ||
      raw.intro_term_months <= 0 ||
      raw.intro_term_months > 60
    ) {
      return { ok: false, reason: "intro_term_months must be a positive integer ≤ 60" };
    }
  }

  if (
    raw.max_balance_cents != null &&
    raw.min_balance_cents != null &&
    raw.max_balance_cents <= raw.min_balance_cents
  ) {
    return { ok: false, reason: "max_balance_cents must be greater than min_balance_cents" };
  }

  if (raw.term_months != null) {
    if (
      typeof raw.term_months !== "number" ||
      !Number.isInteger(raw.term_months) ||
      raw.term_months <= 0 ||
      raw.term_months > 120
    ) {
      return { ok: false, reason: "term_months must be a positive integer ≤ 120" };
    }
  }

  const source = raw.source ?? "manual";
  if (!SAVINGS_SOURCES.has(source)) {
    return { ok: false, reason: `source must be one of ${[...SAVINGS_SOURCES].join(", ")}` };
  }

  return {
    ok: true,
    row: {
      broker_id: raw.broker_id,
      product_kind: raw.product_kind as "savings_account" | "term_deposit",
      rate_bps: raw.rate_bps,
      intro_rate_bps: raw.intro_rate_bps ?? null,
      intro_term_months: raw.intro_term_months ?? null,
      min_balance_cents: raw.min_balance_cents ?? 0,
      max_balance_cents: raw.max_balance_cents ?? null,
      term_months: raw.term_months ?? null,
      source: source as "manual" | "scraped" | "partner_feed",
      notes: raw.notes ?? "",
    },
  };
}

/**
 * Validate a raw loan-rate row against sane bounds. Does NOT hit the DB.
 * Mirrors the constraints in 20260525_investment_loan_rates.sql.
 */
export function validateLoanRateRow(
  raw: Partial<LoanRateRow>,
): ValidationResult<LoanRateRow> {
  if (!raw.lender_slug || typeof raw.lender_slug !== "string" || raw.lender_slug.length > 100) {
    return { ok: false, reason: "lender_slug is required (string, max 100 chars)" };
  }
  if (!/^[a-z0-9-]+$/.test(raw.lender_slug)) {
    return { ok: false, reason: "lender_slug must be lowercase letters, numbers, and hyphens only" };
  }

  if (!raw.lender_name || typeof raw.lender_name !== "string" || raw.lender_name.length > 200) {
    return { ok: false, reason: "lender_name is required (string, max 200 chars)" };
  }

  if (typeof raw.rate_pct !== "number" || !Number.isFinite(raw.rate_pct) || raw.rate_pct < 0 || raw.rate_pct > 99) {
    return { ok: false, reason: "rate_pct must be a finite number in [0, 99]" };
  }

  if (typeof raw.comparison_rate_pct !== "number" || !Number.isFinite(raw.comparison_rate_pct) || raw.comparison_rate_pct < 0 || raw.comparison_rate_pct > 99) {
    return { ok: false, reason: "comparison_rate_pct must be a finite number in [0, 99]" };
  }

  if (typeof raw.max_lvr !== "number" || !Number.isInteger(raw.max_lvr) || raw.max_lvr < 1 || raw.max_lvr > 100) {
    return { ok: false, reason: "max_lvr must be an integer in [1, 100]" };
  }

  if (typeof raw.interest_only !== "boolean") {
    return { ok: false, reason: "interest_only must be a boolean" };
  }

  if (typeof raw.offset_available !== "boolean") {
    return { ok: false, reason: "offset_available must be a boolean" };
  }

  if (typeof raw.min_loan_cents !== "number" || !Number.isInteger(raw.min_loan_cents) || raw.min_loan_cents < 0) {
    return { ok: false, reason: "min_loan_cents must be a non-negative integer" };
  }

  if (!raw.apply_url || typeof raw.apply_url !== "string" || raw.apply_url.length > 500) {
    return { ok: false, reason: "apply_url is required (string, max 500 chars)" };
  }

  return {
    ok: true,
    row: {
      lender_slug: raw.lender_slug,
      lender_name: raw.lender_name,
      rate_pct: raw.rate_pct,
      comparison_rate_pct: raw.comparison_rate_pct,
      max_lvr: raw.max_lvr,
      interest_only: raw.interest_only,
      offset_available: raw.offset_available,
      min_loan_cents: raw.min_loan_cents,
      apply_url: raw.apply_url,
    },
  };
}

// ─── Staleness / Freshness ────────────────────────────────────────────────────

/**
 * Number of whole days between `updatedAt` and `now`.
 * Returns 0 if `updatedAt` is in the future (clock skew defensive).
 */
export function daysSinceUpdate(updatedAt: Date | string | null | undefined, now: Date = new Date()): number {
  if (updatedAt == null) return 0;
  const updated = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  if (!Number.isFinite(updated.getTime())) return 0;
  const diffMs = now.getTime() - updated.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Is the most-recent rate snapshot stale?
 *
 * @param lastCapturedAt  ISO timestamp of the most-recent snapshot (or null if none).
 * @param staleDays       Maximum age before the data is considered stale.
 * @param now             Seam for tests.
 */
export function isStale(
  lastCapturedAt: Date | string | null | undefined,
  staleDays: number,
  now: Date = new Date(),
): boolean {
  if (lastCapturedAt == null) return true; // never ingested
  const days = daysSinceUpdate(lastCapturedAt, now);
  return days >= staleDays;
}

/**
 * Human-readable age string for downstream surfaces.
 * Examples: "just now", "1 day ago", "3 days ago".
 */
export function formatAge(
  lastCapturedAt: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  if (lastCapturedAt == null) return "never";
  const days = daysSinceUpdate(lastCapturedAt, now);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

/**
 * Freshness summary for a rate table — used by the cron to log its data-age
 * assessment before deciding whether to ingest.
 */
export interface FreshnessReport {
  lastCapturedAt: string | null;
  daysSince: number;
  isStale: boolean;
  source: RateSource;
}

export function buildFreshnessReport(
  lastCapturedAt: string | null,
  staleDays: number,
  source: RateSource,
  now: Date = new Date(),
): FreshnessReport {
  const days = daysSinceUpdate(lastCapturedAt, now);
  return {
    lastCapturedAt,
    daysSince: days,
    isStale: isStale(lastCapturedAt, staleDays, now),
    source,
  };
}

// ─── Batch validation ─────────────────────────────────────────────────────────

/** Summary returned by batch-validate helpers. */
export interface BatchValidationResult<T> {
  valid: T[];
  invalid: { index: number; reason: string }[];
}

/**
 * Validate a batch of raw savings-rate rows.
 * Returns valid rows and a list of per-row failures for logging.
 */
export function validateSavingsRateRows(
  raws: Partial<SavingsRateRow>[],
): BatchValidationResult<SavingsRateRow> {
  const valid: SavingsRateRow[] = [];
  const invalid: { index: number; reason: string }[] = [];

  for (const [i, raw] of raws.entries()) {
    const result = validateSavingsRateRow(raw);
    if (result.ok) {
      valid.push(result.row);
    } else {
      log.warn("savings row validation failed", { index: i, reason: result.reason });
      invalid.push({ index: i, reason: result.reason });
    }
  }

  return { valid, invalid };
}

/**
 * Validate a batch of raw loan-rate rows.
 * Returns valid rows and a list of per-row failures for logging.
 */
export function validateLoanRateRows(
  raws: Partial<LoanRateRow>[],
): BatchValidationResult<LoanRateRow> {
  const valid: LoanRateRow[] = [];
  const invalid: { index: number; reason: string }[] = [];

  for (const [i, raw] of raws.entries()) {
    const result = validateLoanRateRow(raw);
    if (result.ok) {
      valid.push(result.row);
    } else {
      log.warn("loan row validation failed", { index: i, reason: result.reason });
      invalid.push({ index: i, reason: result.reason });
    }
  }

  return { valid, invalid };
}
