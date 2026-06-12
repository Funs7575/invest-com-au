/**
 * Advice-fee benchmark — aggregates the marketplace's own quote corpus
 * into medians and ranges by service type × state.
 *
 * Sources (all existing tables, read-only):
 *   - `advisor_auction_bids` joined to `advisor_auctions` — accepted/active
 *     quotes on public marketplace jobs in the last 12 months. Amounts are
 *     in **cents** (same unit the quote UI renders with `/ 100`).
 *   - `advisor_auctions.budget_band` — what consumers *say* they expect to
 *     pay. Bands are ranges, not prices, so they are never mixed into the
 *     quote medians; they surface separately as a per-type context signal.
 *   - `consultations` — productised one-off session prices (cents). These
 *     are a different price class from engagement quotes, so they are
 *     aggregated separately (national, per category) and never merged
 *     into the type × state quote cells.
 *
 * Privacy / integrity rules:
 *   - HARD RULE: any cell with fewer than {@link FEE_BENCHMARK_MIN_SAMPLE}
 *     observations is suppressed (absent from the output — render nothing).
 *   - Cells expose only aggregates (median, IQR, count, freshness and a
 *     21-point quantile grid). Raw bid amounts never leave this module's
 *     server-side fetch; the quantile grid is what percentile lookups use.
 *   - The corpus fetch uses the service-role client because
 *     `advisor_auction_bids` has no public SELECT policy (advisors can only
 *     read their own bids). This is a cross-user aggregate serving anonymous
 *     paths — the documented exception category in CLAUDE.md.
 */

import { cache } from "react";
// eslint-disable-next-line no-restricted-imports -- cross-user aggregation over advisor_auction_bids (own-bids-only RLS, no anon SELECT) serving anonymous pages; only n>=8 aggregates leave this module; service-role legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { cached, CacheTTL } from "@/lib/cache";
import { logger } from "@/lib/logger";
import {
  QUOTE_ADVISOR_TYPES,
  QUOTE_AU_STATES,
} from "@/lib/api-schemas";

const log = logger("fee-benchmark");

// ── Constants ─────────────────────────────────────────────────────────────────

/** Cells with fewer observations than this are suppressed entirely. */
export const FEE_BENCHMARK_MIN_SAMPLE = 8;

/** Lookback window for the quote corpus. */
export const FEE_BENCHMARK_WINDOW_DAYS = 365;

/** Quantile grid resolution: p0, p5, …, p100 → 21 points. */
const QUANTILE_GRID_POINTS = 21;

/** Bid statuses that count as genuine market prices (won or still live). */
const COUNTED_BID_STATUSES = ["accepted", "active"] as const;

/** Defensive cap on corpus pagination (pages × 1000 rows). */
const MAX_FETCH_PAGES = 10;

export type QuoteAdvisorType = (typeof QUOTE_ADVISOR_TYPES)[number];
export type QuoteAuState = (typeof QUOTE_AU_STATES)[number];

/** Display labels for every quote-marketplace advisor type. */
export const QUOTE_TYPE_LABELS: Record<QuoteAdvisorType, string> = {
  smsf_accountant: "SMSF Accountant",
  financial_planner: "Financial Planner",
  property_advisor: "Property Advisor",
  tax_agent: "Tax Agent",
  mortgage_broker: "Mortgage Broker",
  estate_planner: "Estate Planner",
  insurance_broker: "Insurance Broker",
  buyers_agent: "Buyers Agent",
  wealth_manager: "Wealth Manager",
  aged_care_advisor: "Aged Care Advisor",
  crypto_advisor: "Crypto Advisor",
  business_broker: "Business Broker",
  migration_agent: "Migration Agent",
  conveyancer: "Conveyancer",
  property_lawyer: "Property Lawyer",
};

/** Human label for a quote advisor type ("smsf_accountant" → "SMSF Accountant"). */
export function labelForQuoteType(type: string): string {
  return QUOTE_TYPE_LABELS[type as QuoteAdvisorType] ?? type.replace(/_/g, " ");
}

/** Consumer budget-band labels (matches the quote post form). */
export const BUDGET_BAND_LABELS: Record<string, string> = {
  under_500: "Under $500",
  "500_2k": "$500 – $2,000",
  "2k_5k": "$2,000 – $5,000",
  "5k_10k": "$5,000 – $10,000",
  "10k_plus": "$10,000+",
};

export function labelForBudgetBand(band: string): string {
  return BUDGET_BAND_LABELS[band] ?? band.replace(/_/g, " ");
}

// ── Types ─────────────────────────────────────────────────────────────────────

/** One quote observation from the corpus (server-side only). */
export interface BidObservation {
  amountCents: number;
  /** Primary advisor type of the job the quote was submitted on. */
  type: string;
  /** AU state of the job, or null when not stated. */
  state: string | null;
  advisorId: number;
  /** ISO timestamp of the quote. */
  createdAt: string;
}

/** Consumer budget context from posted jobs (briefs). */
export interface BriefBudgetObservation {
  type: string;
  budgetBand: string | null;
}

/** One published consultation price observation. */
export interface ConsultationPriceObservation {
  category: string;
  priceCents: number;
}

/** Aggregates for one service-type × state (or national) cell. */
export interface BenchmarkCell {
  count: number;
  medianCents: number;
  p25Cents: number;
  p75Cents: number;
  /** ISO timestamp of the most recent quote in the cell. */
  latestQuoteAt: string;
  /**
   * Quote distribution as a 21-point quantile grid (p0, p5, …, p100),
   * in cents. Used for percentile lookups without retaining raw amounts.
   */
  quantilesCents: number[];
}

/** Benchmark for one service type: national rollup + per-state cells. */
export interface TypeBenchmark {
  type: string;
  label: string;
  national: BenchmarkCell;
  /** Only states whose cell met the minimum sample; others are absent. */
  byState: Record<string, BenchmarkCell>;
  /** Number of jobs posted for this type in the window (consumer side). */
  briefCount: number;
  /** Most common stated consumer budget band (only when briefCount ≥ min sample). */
  topBudgetBand: string | null;
}

/** National consultation-price summary for one category. */
export interface ConsultationBenchmark {
  category: string;
  label: string;
  count: number;
  medianCents: number;
  p25Cents: number;
  p75Cents: number;
}

export interface FeeBenchmark {
  generatedAt: string;
  windowDays: number;
  /** Total counted quotes across all types (national, pre-suppression). */
  totalQuotes: number;
  /** Only types whose national cell met the minimum sample. */
  types: TypeBenchmark[];
  /** One-off consultation sessions — separate price class, national only. */
  consultations: ConsultationBenchmark[];
}

/** Everything needed to render a percentile chip for one bid. */
export interface FeePercentileInfo {
  /** Rounded display percentile (nearest 5, clamped 5–95). */
  percentile: number;
  typeLabel: string;
  /** State the comparison cell covers, or null when national. */
  stateUsed: string | null;
  sampleSize: number;
  windowDays: number;
}

export type PricingPosition =
  | { status: "no_bids" }
  | {
      status: "insufficient_peers";
      type: string;
      label: string;
      ownBidCount: number;
      peerCount: number;
      minSample: number;
    }
  | {
      status: "ok";
      type: string;
      label: string;
      /** Advisor's counted quotes in their main category within the window. */
      ownBidCount: number;
      /** Median of the advisor's own quotes in the category, cents. */
      typicalCents: number;
      /** Exact midrank percentile (0–100, rounded to integer) vs peer quotes. */
      percentile: number;
      peerCount: number;
      peerMedianCents: number;
      peerP25Cents: number;
      peerP75Cents: number;
      windowDays: number;
    };

// ── Pure math ─────────────────────────────────────────────────────────────────

/**
 * Linear-interpolated quantile of an ascending-sorted array.
 * `p` in [0, 1]. Callers must guard against empty input.
 */
export function quantileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const clamped = Math.min(1, Math.max(0, p));
  const idx = clamped * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? a;
  return lo === hi ? a : a + (b - a) * (idx - lo);
}

/**
 * Exact midrank percentile of `x` within `values` (0–100):
 * (count below + half the ties) / n. Standard tie-fair definition.
 */
export function midrankPercentile(values: number[], x: number): number {
  if (values.length === 0) return Number.NaN;
  let below = 0;
  let equal = 0;
  for (const v of values) {
    if (v < x) below++;
    else if (v === x) equal++;
  }
  return ((below + equal / 2) / values.length) * 100;
}

/**
 * Build a benchmark cell from raw amounts. Returns null (suppressed)
 * when there are fewer than {@link FEE_BENCHMARK_MIN_SAMPLE} observations.
 */
export function buildCell(
  amountsCents: number[],
  createdAts: string[],
): BenchmarkCell | null {
  const clean = amountsCents.filter((a) => Number.isFinite(a) && a > 0);
  if (clean.length < FEE_BENCHMARK_MIN_SAMPLE) return null;

  const sorted = [...clean].sort((a, b) => a - b);
  const quantilesCents: number[] = [];
  for (let i = 0; i < QUANTILE_GRID_POINTS; i++) {
    quantilesCents.push(Math.round(quantileSorted(sorted, i / (QUANTILE_GRID_POINTS - 1))));
  }

  let latest = "";
  for (const d of createdAts) {
    if (d > latest) latest = d;
  }

  return {
    count: sorted.length,
    medianCents: Math.round(quantileSorted(sorted, 0.5)),
    p25Cents: Math.round(quantileSorted(sorted, 0.25)),
    p75Cents: Math.round(quantileSorted(sorted, 0.75)),
    latestQuoteAt: latest,
    quantilesCents,
  };
}

/**
 * Percentile (0–100) of an amount within a cell's quantile grid.
 * Interpolates between grid points; flat (tied) runs resolve to the
 * midpoint of the run so identical prices share a fair percentile.
 */
export function percentileForAmount(cell: BenchmarkCell, amountCents: number): number {
  const grid = cell.quantilesCents;
  const n = grid.length;
  if (n === 0) return Number.NaN;
  const step = 100 / (n - 1);

  const first = grid[0] ?? 0;
  const last = grid[n - 1] ?? first;
  if (amountCents < first) return 0;
  if (amountCents > last) return 100;

  // Indices bounding the amount: lower = last grid point <= amount,
  // upper = first grid point >= amount. Both exist after the guards above.
  let lower = 0;
  let upper = n - 1;
  for (let i = 0; i < n; i++) {
    const g = grid[i] ?? 0;
    if (g <= amountCents) lower = i;
    else {
      upper = i;
      break;
    }
  }

  const lowerVal = grid[lower] ?? 0;

  if (lowerVal === amountCents) {
    // Exact hit — resolve to the midpoint of the full equal (tied) run.
    let runStart = lower;
    while (runStart > 0 && (grid[runStart - 1] ?? Number.NaN) === lowerVal) runStart--;
    return ((runStart + lower) / 2) * step;
  }

  // Strictly between two distinct grid values: interpolate.
  const upperVal = grid[upper] ?? lowerVal;
  const span = upperVal - lowerVal;
  const frac = span === 0 ? 0 : (amountCents - lowerVal) / span;
  return (lower + frac * (upper - lower)) * step;
}

/** Round a raw percentile to the nearest 5 and clamp to [5, 95] for display. */
export function roundedDisplayPercentile(raw: number): number {
  if (!Number.isFinite(raw)) return 50;
  const nearest5 = Math.round(raw / 5) * 5;
  return Math.min(95, Math.max(5, nearest5));
}

/** Ordinal label: 35 → "35th", 21 → "21st". */
export function ordinal(n: number): string {
  const abs = Math.abs(Math.round(n));
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${abs}th`;
  const mod10 = abs % 10;
  if (mod10 === 1) return `${abs}st`;
  if (mod10 === 2) return `${abs}nd`;
  if (mod10 === 3) return `${abs}rd`;
  return `${abs}th`;
}

/** "$1,200" — whole dollars from cents, en-AU grouping. */
export function formatCentsAUD(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

// ── Aggregation ───────────────────────────────────────────────────────────────

/**
 * Build the full benchmark from raw observations. Pure — no I/O.
 */
export function buildFeeBenchmark(
  bids: BidObservation[],
  briefs: BriefBudgetObservation[] = [],
  consultations: ConsultationPriceObservation[] = [],
  now: Date = new Date(),
): FeeBenchmark {
  // Group bids by type, then by state within type.
  const byType = new Map<string, BidObservation[]>();
  for (const ob of bids) {
    if (!ob.type || !Number.isFinite(ob.amountCents) || ob.amountCents <= 0) continue;
    const arr = byType.get(ob.type);
    if (arr) arr.push(ob);
    else byType.set(ob.type, [ob]);
  }

  // Consumer budget context per type.
  const briefCounts = new Map<string, number>();
  const bandCounts = new Map<string, Map<string, number>>();
  for (const brief of briefs) {
    if (!brief.type) continue;
    briefCounts.set(brief.type, (briefCounts.get(brief.type) ?? 0) + 1);
    const band = brief.budgetBand;
    if (!band || band === "not_sure") continue;
    let bands = bandCounts.get(brief.type);
    if (!bands) {
      bands = new Map<string, number>();
      bandCounts.set(brief.type, bands);
    }
    bands.set(band, (bands.get(band) ?? 0) + 1);
  }

  const types: TypeBenchmark[] = [];
  let totalQuotes = 0;

  for (const [type, observations] of byType) {
    totalQuotes += observations.length;
    const national = buildCell(
      observations.map((o) => o.amountCents),
      observations.map((o) => o.createdAt),
    );
    if (!national) continue; // suppressed — a state cell can never exceed national

    const byState: Record<string, BenchmarkCell> = {};
    for (const state of QUOTE_AU_STATES) {
      const inState = observations.filter((o) => o.state === state);
      const cell = buildCell(
        inState.map((o) => o.amountCents),
        inState.map((o) => o.createdAt),
      );
      if (cell) byState[state] = cell;
    }

    const briefCount = briefCounts.get(type) ?? 0;
    let topBudgetBand: string | null = null;
    if (briefCount >= FEE_BENCHMARK_MIN_SAMPLE) {
      const bands = bandCounts.get(type);
      if (bands) {
        let best = 0;
        for (const [band, count] of bands) {
          if (count > best) {
            best = count;
            topBudgetBand = band;
          }
        }
      }
    }

    types.push({
      type,
      label: labelForQuoteType(type),
      national,
      byState,
      briefCount,
      topBudgetBand,
    });
  }

  // Stable ordering: biggest corpus first, then alphabetical.
  types.sort((a, b) => b.national.count - a.national.count || a.label.localeCompare(b.label));

  // Consultations — national per category, same suppression rule.
  const byCategory = new Map<string, number[]>();
  for (const c of consultations) {
    if (!Number.isFinite(c.priceCents) || c.priceCents <= 0) continue;
    const key = c.category || "general";
    const arr = byCategory.get(key);
    if (arr) arr.push(c.priceCents);
    else byCategory.set(key, [c.priceCents]);
  }
  const consultationBenchmarks: ConsultationBenchmark[] = [];
  for (const [category, prices] of byCategory) {
    if (prices.length < FEE_BENCHMARK_MIN_SAMPLE) continue;
    const sorted = [...prices].sort((a, b) => a - b);
    consultationBenchmarks.push({
      category,
      label: category
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      count: sorted.length,
      medianCents: Math.round(quantileSorted(sorted, 0.5)),
      p25Cents: Math.round(quantileSorted(sorted, 0.25)),
      p75Cents: Math.round(quantileSorted(sorted, 0.75)),
    });
  }
  consultationBenchmarks.sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );

  return {
    generatedAt: now.toISOString(),
    windowDays: FEE_BENCHMARK_WINDOW_DAYS,
    totalQuotes,
    types,
    consultations: consultationBenchmarks,
  };
}

/**
 * Pick the most local unsuppressed cell for a type + state:
 * the state cell when it met the sample floor, otherwise national.
 * Returns null when the type has no benchmark at all.
 */
export function benchmarkCellFor(
  benchmark: FeeBenchmark,
  type: string,
  state: string | null,
): { cell: BenchmarkCell; stateUsed: string | null } | null {
  const row = benchmark.types.find((t) => t.type === type);
  if (!row) return null;
  if (state) {
    const stateCell = row.byState[state];
    if (stateCell) return { cell: stateCell, stateUsed: state };
  }
  return { cell: row.national, stateUsed: null };
}

/**
 * Percentile chip payload for one bid amount, or null when the matching
 * cell is suppressed / missing. Display percentile is rounded to the
 * nearest 5 and clamped to 5–95 — the chip says "around", and we never
 * imply single-quote precision.
 */
export function percentileInfoForBid(
  benchmark: FeeBenchmark,
  type: string | null | undefined,
  state: string | null,
  amountCents: number,
): FeePercentileInfo | null {
  if (!type || !Number.isFinite(amountCents) || amountCents <= 0) return null;
  const match = benchmarkCellFor(benchmark, type, state);
  if (!match) return null;
  const raw = percentileForAmount(match.cell, amountCents);
  return {
    percentile: roundedDisplayPercentile(raw),
    typeLabel: labelForQuoteType(type),
    stateUsed: match.stateUsed,
    sampleSize: match.cell.count,
    windowDays: benchmark.windowDays,
  };
}

/**
 * Where an advisor's typical quote sits vs peers in their main category
 * (the category they quote on most). Peers exclude the advisor's own
 * quotes; requires at least {@link FEE_BENCHMARK_MIN_SAMPLE} peer quotes.
 */
export function computePricingPosition(
  bids: BidObservation[],
  advisorId: number,
): PricingPosition {
  const own = bids.filter((b) => b.advisorId === advisorId && b.amountCents > 0);
  if (own.length === 0) return { status: "no_bids" };

  // Main category = mode of the advisor's own quote types.
  const typeCounts = new Map<string, number>();
  for (const b of own) {
    typeCounts.set(b.type, (typeCounts.get(b.type) ?? 0) + 1);
  }
  let mainType = "";
  let best = 0;
  for (const [type, count] of typeCounts) {
    if (count > best || (count === best && type < mainType)) {
      best = count;
      mainType = type;
    }
  }

  const ownInType = own
    .filter((b) => b.type === mainType)
    .map((b) => b.amountCents)
    .sort((a, b) => a - b);
  const peerAmounts = bids
    .filter((b) => b.advisorId !== advisorId && b.type === mainType && b.amountCents > 0)
    .map((b) => b.amountCents)
    .sort((a, b) => a - b);

  if (peerAmounts.length < FEE_BENCHMARK_MIN_SAMPLE) {
    return {
      status: "insufficient_peers",
      type: mainType,
      label: labelForQuoteType(mainType),
      ownBidCount: ownInType.length,
      peerCount: peerAmounts.length,
      minSample: FEE_BENCHMARK_MIN_SAMPLE,
    };
  }

  const typicalCents = Math.round(quantileSorted(ownInType, 0.5));
  return {
    status: "ok",
    type: mainType,
    label: labelForQuoteType(mainType),
    ownBidCount: ownInType.length,
    typicalCents,
    percentile: Math.round(midrankPercentile(peerAmounts, typicalCents)),
    peerCount: peerAmounts.length,
    peerMedianCents: Math.round(quantileSorted(peerAmounts, 0.5)),
    peerP25Cents: Math.round(quantileSorted(peerAmounts, 0.25)),
    peerP75Cents: Math.round(quantileSorted(peerAmounts, 0.75)),
    windowDays: FEE_BENCHMARK_WINDOW_DAYS,
  };
}

// ── Data access (server only) ─────────────────────────────────────────────────

interface RawBidRow {
  bid_amount: number | null;
  created_at: string | null;
  advisor_id: number | null;
  advisor_auctions: {
    advisor_types: string[] | null;
    location: string | null;
  } | null;
}

interface RawBriefRow {
  advisor_types: string[] | null;
  budget_band: string | null;
}

interface FeeBenchmarkSource {
  bids: BidObservation[];
  briefs: BriefBudgetObservation[];
  consultations: ConsultationPriceObservation[];
}

async function fetchFeeBenchmarkSourceUncached(): Promise<FeeBenchmarkSource> {
  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - FEE_BENCHMARK_WINDOW_DAYS);
  const sinceIso = since.toISOString();

  // 1) Quote corpus: accepted/active bids on public marketplace jobs.
  const bids: BidObservation[] = [];
  for (let page = 0; page < MAX_FETCH_PAGES; page++) {
    const { data, error } = await admin
      .from("advisor_auction_bids")
      .select(
        "bid_amount, created_at, advisor_id, advisor_auctions!inner(advisor_types, location, source, is_public)",
      )
      .in("status", [...COUNTED_BID_STATUSES])
      .gte("created_at", sinceIso)
      .eq("advisor_auctions.source", "public_job")
      .eq("advisor_auctions.is_public", true)
      .order("id", { ascending: true })
      .range(page * 1000, page * 1000 + 999);

    if (error) {
      log.error("Failed to fetch bid corpus", { error: error.message, page });
      break;
    }
    const rows = (data ?? []) as unknown as RawBidRow[];
    for (const row of rows) {
      const primaryType = row.advisor_auctions?.advisor_types?.[0];
      if (!primaryType || !row.bid_amount || row.bid_amount <= 0) continue;
      const state = row.advisor_auctions?.location ?? null;
      bids.push({
        amountCents: row.bid_amount,
        type: primaryType,
        state:
          state && (QUOTE_AU_STATES as readonly string[]).includes(state) ? state : null,
        advisorId: row.advisor_id ?? 0,
        createdAt: row.created_at ?? sinceIso,
      });
    }
    if (rows.length < 1000) break;
  }

  // 2) Consumer budget bands from posted jobs in the same window.
  const briefs: BriefBudgetObservation[] = [];
  for (let page = 0; page < MAX_FETCH_PAGES; page++) {
    const { data, error } = await admin
      .from("advisor_auctions")
      .select("advisor_types, budget_band")
      .eq("source", "public_job")
      .eq("is_public", true)
      .gte("created_at", sinceIso)
      .order("id", { ascending: true })
      .range(page * 1000, page * 1000 + 999);

    if (error) {
      log.error("Failed to fetch brief budget bands", { error: error.message, page });
      break;
    }
    const rows = (data ?? []) as unknown as RawBriefRow[];
    for (const row of rows) {
      const primaryType = row.advisor_types?.[0];
      if (!primaryType) continue;
      briefs.push({ type: primaryType, budgetBand: row.budget_band ?? null });
    }
    if (rows.length < 1000) break;
  }

  // 3) Consultations — optional source; skip gracefully on any failure.
  let consultations: ConsultationPriceObservation[] = [];
  try {
    const { data, error } = await admin
      .from("consultations")
      .select("category, price")
      .eq("status", "published")
      .limit(1000);
    if (error) {
      log.warn("Consultations source unavailable — skipping", { error: error.message });
    } else {
      consultations = ((data ?? []) as { category: string | null; price: number | null }[])
        .filter((c) => typeof c.price === "number" && c.price > 0)
        .map((c) => ({ category: c.category ?? "general", priceCents: c.price as number }));
    }
  } catch (err) {
    log.warn("Consultations source threw — skipping", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return { bids, briefs, consultations };
}

/**
 * Cross-request cached corpus (1h, tag `fee-benchmark`). One cache entry
 * feeds both the public benchmark and the adviser pricing-position API.
 */
const fetchFeeBenchmarkSource = cached(
  fetchFeeBenchmarkSourceUncached,
  ["fee-benchmark"],
  { revalidate: CacheTTL.MODERATE },
);

/**
 * The full fee benchmark — cached cross-request (corpus, 1h) and deduped
 * within a render pass. Safe to call from ISR pages, dynamic pages and
 * route handlers; only aggregates are returned.
 */
export const getFeeBenchmark = cache(async (): Promise<FeeBenchmark> => {
  const source = await fetchFeeBenchmarkSource();
  return buildFeeBenchmark(source.bids, source.briefs, source.consultations);
});

/**
 * Pricing position for one advisor vs peers in their main category.
 * Uses the same cached corpus as the public benchmark.
 */
export async function getAdvisorPricingPosition(
  advisorId: number,
): Promise<PricingPosition> {
  const source = await fetchFeeBenchmarkSource();
  return computePricingPosition(source.bids, advisorId);
}
