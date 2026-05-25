/**
 * lib/pro-insights.ts
 *
 * Data-assembly helpers for the Pro Insights dashboard (/pro/insights).
 *
 * These functions transform data already held in existing tables —
 * broker_price_snapshots, broker_health_scores, broker_health_score_history,
 * investment_loan_rates — into dashboard-ready shapes without duplicating
 * any calculation logic from fee-index.ts or health-score-trends.ts.
 *
 * All functions are pure transformers (no I/O). Data fetching lives in
 * the page server component so these can be exercised in fast unit tests.
 *
 * AFSL / compliance note:
 *   Every output is a factual data view. No function ranks brokers as
 *   "best" or issues a recommendation. The dashboard renders all values
 *   alongside the GENERAL_ADVICE_WARNING from lib/compliance.ts.
 */

import {
  latestPerActiveBroker,
  type FeeSnapshotRow,
} from "@/lib/fee-index";
import {
  summariseTrend,
  formatDelta,
  type HealthScoreHistoryRow,
  type TrendSummary,
} from "@/lib/health-score-trends";
import type { BrokerHealthScore } from "@/lib/types";

// ─── Fee comparison ──────────────────────────────────────────────────────────

export interface BrokerFeeRow {
  /** Broker display slug */
  slug: string;
  /** Display name — not available in snapshot rows; caller joins it */
  name: string;
  asxFee: number | null;
  usFee: number | null;
  fxSpread: number | null;
}

/**
 * Builds a full-broker ASX/US fee comparison table from a raw window of
 * broker_price_snapshots rows, suitable for the "all brokers" Pro view.
 *
 * Uses `latestPerActiveBroker` from fee-index.ts (de-duplication + active
 * filter) so the logic is not re-implemented here.
 *
 * `nameMap` maps broker_slug → display name. Slugs with no name entry are
 * included with their slug as the display name so the table is always complete.
 */
export function buildFeeComparisonRows(
  snapshots: FeeSnapshotRow[],
  nameMap: Map<string, string>,
): BrokerFeeRow[] {
  const brokers = latestPerActiveBroker(snapshots);

  return brokers
    .map((b) => ({
      slug: b.broker_slug,
      name: nameMap.get(b.broker_slug) ?? b.broker_slug,
      asxFee: b.asx_fee_value,
      usFee: b.us_fee_value,
      fxSpread: b.fx_rate,
    }))
    .sort((a, b) => {
      // Sort by ASX fee ascending (nulls last) then alphabetically.
      if (a.asxFee === null && b.asxFee === null) return a.name.localeCompare(b.name);
      if (a.asxFee === null) return 1;
      if (b.asxFee === null) return -1;
      if (a.asxFee !== b.asxFee) return a.asxFee - b.asxFee;
      return a.name.localeCompare(b.name);
    });
}

// ─── Health score movers ─────────────────────────────────────────────────────

export interface HealthScoreMover {
  slug: string;
  name: string;
  currentScore: number;
  trend: TrendSummary;
}

/**
 * Identifies brokers with the largest absolute health score delta over the
 * supplied history window, returning the top `limit` movers sorted by
 * |delta| descending.
 *
 * `scores`   — current broker_health_scores rows (one per broker).
 * `histories` — map from broker_slug → ordered array of history rows.
 * `nameMap`  — broker_slug → display name.
 * `limit`    — how many movers to return (default 5).
 */
export function buildHealthScoreMovers(
  scores: BrokerHealthScore[],
  histories: Map<string, HealthScoreHistoryRow[]>,
  nameMap: Map<string, string>,
  limit = 5,
): HealthScoreMover[] {
  const movers: HealthScoreMover[] = [];

  for (const score of scores) {
    const history = histories.get(score.broker_slug) ?? [];
    const trend = summariseTrend(history);
    if (!trend) continue;
    // Only surface brokers with a meaningful movement.
    if (Math.abs(trend.delta) < 0.5) continue;

    movers.push({
      slug: score.broker_slug,
      name: nameMap.get(score.broker_slug) ?? score.broker_slug,
      currentScore: score.overall_score,
      trend,
    });
  }

  return movers
    .sort((a, b) => Math.abs(b.trend.delta) - Math.abs(a.trend.delta))
    .slice(0, limit);
}

// ─── Loan rate movements ─────────────────────────────────────────────────────

export interface LoanRateRow {
  lender_name: string;
  lender_slug: string;
  rate_pct: number;
  comparison_rate_pct: number;
  max_lvr: number;
  interest_only: boolean;
  offset_available: boolean;
  updated_at: string;
}

export interface LoanRateSummary {
  lowestRate: number | null;
  highestRate: number | null;
  medianRate: number | null;
  /** Rates updated within the last 30 days */
  recentlyUpdated: LoanRateRow[];
  /** All rates sorted ascending by rate_pct */
  allRates: LoanRateRow[];
}

/**
 * Derives a summary from raw investment_loan_rates rows.
 *
 * `recentlyUpdated` is defined as updated within the last 30 calendar days.
 * No I/O — rows must be fetched by the caller (page server component).
 */
export function buildLoanRateSummary(
  rows: LoanRateRow[],
  now: Date = new Date(),
): LoanRateSummary {
  if (rows.length === 0) {
    return {
      lowestRate: null,
      highestRate: null,
      medianRate: null,
      recentlyUpdated: [],
      allRates: [],
    };
  }

  const sorted = [...rows].sort((a, b) => a.rate_pct - b.rate_pct);
  const rates = sorted.map((r) => r.rate_pct);

  const lowestRate = rates[0] ?? null;
  const highestRate = rates[rates.length - 1] ?? null;

  const mid = Math.floor(rates.length / 2);
  const medianRate =
    rates.length % 2 === 0
      ? (((rates[mid - 1] as number) + (rates[mid] as number)) / 2)
      : (rates[mid] as number);

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentlyUpdated = rows.filter(
    (r) => new Date(r.updated_at) >= thirtyDaysAgo,
  );

  return {
    lowestRate,
    highestRate,
    medianRate: Math.round(medianRate * 100) / 100,
    recentlyUpdated,
    allRates: sorted,
  };
}

// ─── Re-export formatDelta so callers can format trend deltas without
//     importing from health-score-trends directly (single import point
//     for dashboard consumers).
export { formatDelta };
