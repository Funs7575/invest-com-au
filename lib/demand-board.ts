/**
 * Demand Board — anonymised aggregation over open marketplace demand.
 *
 * Powers /for-advisors/demand (the public supply-acquisition board) and the
 * weekly "demand in your area" digest cron. The whole module is built around
 * one privacy rule, mirroring app/quotes/recent-wins:
 *
 *   NOTHING row-identifying ever leaves this module's public aggregates.
 *   No consumer PII, no job titles, no free-text descriptions, no slugs,
 *   no ids — only counts, budget BANDS, advisor types, states, and coarse
 *   recency. Redaction starts at the SELECT: PII columns are never fetched.
 *
 * Small-count handling (per the board's anonymity bar):
 *   - Counts of 1+ are fine to show — "1 open brief in TAS" identifies
 *     nobody.
 *   - Budget-band DETAIL is suppressed below MIN_BAND_SAMPLE rows, so a
 *     single brief's band can never be read off the board (a count of one
 *     plus its band would effectively republish that brief's budget).
 */

import { logger } from "@/lib/logger";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import { QUOTE_AU_STATES, QUOTE_BUDGET_BANDS } from "@/lib/api-schemas";
// eslint-disable-next-line no-restricted-imports -- anonymous-path aggregate helper: the public anon SELECT policy on advisor_auctions only exposes flow_type='auction' rows, but the board must also count accept-flow briefs (deny-all to anon by design). No JWT exists on this path; the helper selects zero PII columns and returns aggregate counts/bands only. See CLAUDE.md § "Two Supabase clients".
import { createAdminClient } from "@/lib/supabase/admin";

const log = logger("demand-board");

// ── Domain constants ─────────────────────────────────────────────────────────

export type AuState = (typeof QUOTE_AU_STATES)[number];
export type BudgetBand = (typeof QUOTE_BUDGET_BANDS)[number];

/** Bands that carry a dollar range, in ascending order. `not_sure` excluded. */
export const ORDERED_DOLLAR_BANDS = [
  "under_500",
  "500_2k",
  "2k_5k",
  "5k_10k",
  "10k_plus",
] as const satisfies readonly BudgetBand[];

export const BUDGET_BAND_LABELS: Record<BudgetBand, string> = {
  under_500: "Under $500",
  "500_2k": "$500–$2,000",
  "2k_5k": "$2,000–$5,000",
  "5k_10k": "$5,000–$10,000",
  "10k_plus": "$10,000+",
  not_sure: "Budget not stated",
};

/**
 * Conservative AUD midpoints used for the "estimated fees on the board"
 * figure and the earnings estimator. `10k_plus` is deliberately pinned
 * low (not an average of open-ended budgets) so every derived number is
 * an under-promise. `not_sure` carries no dollar value.
 */
const BAND_MIDPOINT_AUD: Record<BudgetBand, number | null> = {
  under_500: 350,
  "500_2k": 1250,
  "2k_5k": 3500,
  "5k_10k": 7500,
  "10k_plus": 12000,
  not_sure: null,
};

/**
 * Minimum number of banded rows before any budget-band detail (mix,
 * median) is shown for a slice. Below this a band would describe an
 * individual brief rather than a market.
 */
export const MIN_BAND_SAMPLE = 3;

/**
 * `prospects.external_id` prefix for demand-board alert subscribers
 * (rows written by POST /api/demand-alerts, read by the weekly digest
 * cron and the site-wide unsubscribe route). Lives here because Next
 * route files may only export route handlers/config.
 */
export const DEMAND_ALERT_EXTERNAL_PREFIX = "demand-alert:";

/** Cap on rows fetched per query — bounds memory on a runaway marketplace. */
const FETCH_LIMIT = 2000;

const ACCEPTED_WINDOW_DAYS = 90;

const AU_STATE_SET: ReadonlySet<string> = new Set(QUOTE_AU_STATES);
const BAND_SET: ReadonlySet<string> = new Set(QUOTE_BUDGET_BANDS);

// ── Pure helpers (exported for tests) ────────────────────────────────────────

export function bandMidpointAud(band: string | null | undefined): number | null {
  if (!band || !BAND_SET.has(band)) return null;
  return BAND_MIDPOINT_AUD[band as BudgetBand];
}

export function budgetBandLabel(band: string | null | undefined): string {
  if (!band || !BAND_SET.has(band)) return BUDGET_BAND_LABELS.not_sure;
  return BUDGET_BAND_LABELS[band as BudgetBand];
}

/** Human label for an advisor-type slug, with a safe fallback for drift. */
export function advisorTypeLabel(type: string): string {
  const known = (PROFESSIONAL_TYPE_LABELS as Record<string, string>)[type];
  if (known) return known;
  return type
    .split("_")
    .map((w) => (w.length > 0 ? `${w.charAt(0).toUpperCase()}${w.slice(1)}` : w))
    .join(" ");
}

/**
 * Median budget band over a set of rows, ignoring `not_sure` / unknown
 * values. Even-length samples take the lower-middle band — another
 * deliberate under-promise. Returns null when fewer than
 * `MIN_BAND_SAMPLE` usable bands exist (suppression rule).
 */
export function medianBudgetBand(bands: ReadonlyArray<string | null | undefined>): BudgetBand | null {
  const ranked: number[] = [];
  for (const band of bands) {
    if (!band) continue;
    const idx = (ORDERED_DOLLAR_BANDS as readonly string[]).indexOf(band);
    if (idx >= 0) ranked.push(idx);
  }
  if (ranked.length < MIN_BAND_SAMPLE) return null;
  ranked.sort((a, b) => a - b);
  const mid = ranked[Math.floor((ranked.length - 1) / 2)];
  if (mid === undefined) return null;
  return ORDERED_DOLLAR_BANDS[mid] ?? null;
}

// ── Aggregation ──────────────────────────────────────────────────────────────

/**
 * The only columns this module is ever allowed to read from
 * `advisor_auctions` for open demand. Adding a column here is a
 * privacy-review event, not a refactor.
 */
export interface DemandSourceRow {
  advisor_types: string[] | null;
  location: string | null;
  budget_band: string | null;
  created_at: string;
  flow_type: string;
}

export interface DemandCell {
  state: AuState;
  type: string;
  label: string;
  count: number;
}

export interface StateDemand {
  state: AuState;
  count: number;
  postedThisWeek: number;
  /** Sum of band midpoints for this state's open briefs (estimate). */
  estFeePoolAud: number;
  /** Hours since the newest open brief in this state was posted. */
  newestAgeHours: number | null;
}

export interface TypeDemand {
  type: string;
  label: string;
  count: number;
  states: AuState[];
  /** Median stated band — null (suppressed) when count < MIN_BAND_SAMPLE. */
  medianBand: BudgetBand | null;
  /** Display label for `medianBand` (resolved server-side; client components must not import band maps). */
  medianBandLabel: string | null;
}

export interface DemandSnapshot {
  totalOpen: number;
  postedToday: number;
  postedThisWeek: number;
  byState: StateDemand[];
  byType: TypeDemand[];
  cells: DemandCell[];
  /** Global band mix — null (suppressed) when fewer than MIN_BAND_SAMPLE banded rows. */
  bandMix: Array<{ band: BudgetBand; label: string; count: number }> | null;
  /** Median stated band across all open briefs — null when suppressed. */
  medianOpenBand: BudgetBand | null;
  /** Sum of conservative band midpoints across all open briefs (AUD). */
  estFeePoolAud: number;
  /** Open briefs whose location isn't a recognised AU state (counted in totals only). */
  unspecifiedLocation: number;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Pure aggregation — testable without Supabase. */
export function aggregateDemand(rows: readonly DemandSourceRow[], now: Date = new Date()): DemandSnapshot {
  const nowMs = now.getTime();
  const dayAgo = nowMs - DAY_MS;
  const weekAgo = nowMs - 7 * DAY_MS;

  let postedToday = 0;
  let postedThisWeek = 0;
  let unspecifiedLocation = 0;
  let estFeePoolAud = 0;

  const stateAgg = new Map<AuState, { count: number; postedThisWeek: number; estFeePoolAud: number; newestMs: number }>();
  const typeAgg = new Map<string, { count: number; states: Set<AuState>; bands: Array<string | null> }>();
  const cellAgg = new Map<string, { state: AuState; type: string; count: number }>();
  const allBands: Array<string | null> = [];
  const bandCounts = new Map<BudgetBand, number>();

  for (const row of rows) {
    const createdMs = Date.parse(row.created_at);
    const isToday = Number.isFinite(createdMs) && createdMs >= dayAgo;
    const isThisWeek = Number.isFinite(createdMs) && createdMs >= weekAgo;
    if (isToday) postedToday += 1;
    if (isThisWeek) postedThisWeek += 1;

    const midpoint = bandMidpointAud(row.budget_band);
    if (midpoint !== null) estFeePoolAud += midpoint;

    const band = row.budget_band && BAND_SET.has(row.budget_band) ? (row.budget_band as BudgetBand) : null;
    allBands.push(band);
    if (band && band !== "not_sure") {
      bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1);
    }

    const state: AuState | null =
      row.location && AU_STATE_SET.has(row.location) ? (row.location as AuState) : null;
    if (!state) {
      unspecifiedLocation += 1;
    } else {
      const agg = stateAgg.get(state) ?? { count: 0, postedThisWeek: 0, estFeePoolAud: 0, newestMs: 0 };
      agg.count += 1;
      if (isThisWeek) agg.postedThisWeek += 1;
      if (midpoint !== null) agg.estFeePoolAud += midpoint;
      if (Number.isFinite(createdMs) && createdMs > agg.newestMs) agg.newestMs = createdMs;
      stateAgg.set(state, agg);
    }

    // One brief can request several advisor types — it appears in each
    // type bucket, while totals count distinct briefs.
    const types = (row.advisor_types ?? []).filter((t) => typeof t === "string" && t.length > 0);
    for (const type of types) {
      const agg = typeAgg.get(type) ?? { count: 0, states: new Set<AuState>(), bands: [] };
      agg.count += 1;
      if (state) agg.states.add(state);
      agg.bands.push(band);
      typeAgg.set(type, agg);

      if (state) {
        const key = `${state}::${type}`;
        const cell = cellAgg.get(key) ?? { state, type, count: 0 };
        cell.count += 1;
        cellAgg.set(key, cell);
      }
    }
  }

  const byState: StateDemand[] = Array.from(stateAgg.entries())
    .map(([state, agg]) => ({
      state,
      count: agg.count,
      postedThisWeek: agg.postedThisWeek,
      estFeePoolAud: agg.estFeePoolAud,
      newestAgeHours: agg.newestMs > 0 ? Math.max(0, Math.floor((nowMs - agg.newestMs) / HOUR_MS)) : null,
    }))
    .sort((a, b) => b.count - a.count || a.state.localeCompare(b.state));

  const byType: TypeDemand[] = Array.from(typeAgg.entries())
    .map(([type, agg]) => {
      const medianBand = medianBudgetBand(agg.bands);
      return {
        type,
        label: advisorTypeLabel(type),
        count: agg.count,
        states: Array.from(agg.states).sort(),
        medianBand,
        medianBandLabel: medianBand ? BUDGET_BAND_LABELS[medianBand] : null,
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const cells: DemandCell[] = Array.from(cellAgg.values())
    .map((c) => ({ ...c, label: advisorTypeLabel(c.type) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const bandedRowCount = allBands.filter((b) => b !== null && b !== "not_sure").length;
  const bandMix =
    bandedRowCount >= MIN_BAND_SAMPLE
      ? ORDERED_DOLLAR_BANDS.filter((band) => (bandCounts.get(band) ?? 0) > 0).map((band) => ({
          band,
          label: BUDGET_BAND_LABELS[band],
          count: bandCounts.get(band) ?? 0,
        }))
      : null;

  return {
    totalOpen: rows.length,
    postedToday,
    postedThisWeek,
    byState,
    byType,
    cells,
    bandMix,
    medianOpenBand: medianBudgetBand(allBands),
    estFeePoolAud,
    unspecifiedLocation,
  };
}

// ── Data access ──────────────────────────────────────────────────────────────

export interface AcceptedSample {
  count: number;
  /** Median accepted band over the window — null (suppressed) when count < MIN_BAND_SAMPLE. */
  medianBand: BudgetBand | null;
}

export interface DemandBoardData {
  snapshot: DemandSnapshot;
  accepted: AcceptedSample;
  generatedAt: string;
}

export function emptyDemandBoardData(now: Date = new Date()): DemandBoardData {
  return {
    snapshot: aggregateDemand([], now),
    accepted: { count: 0, medianBand: null },
    generatedAt: now.toISOString(),
  };
}

/**
 * Fetch the redacted open-demand rows. Only `is_public` briefs that are
 * genuinely live: status='open', not past their deadline, and not held in
 * (or rejected by) risk review. Selects the five anonymous columns and
 * nothing else.
 *
 * Exported for the weekly digest cron, which needs row-level (state ×
 * types × band) matching against subscriber interests. The rows are
 * already anonymous; they must still never be rendered individually.
 */
export async function fetchOpenDemandRows(): Promise<DemandSourceRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("advisor_auctions")
    .select("advisor_types, location, budget_band, created_at, flow_type")
    .eq("is_public", true)
    .eq("status", "open")
    .gt("ends_at", new Date().toISOString())
    .in("risk_review_status", ["clear", "approved"])
    .order("created_at", { ascending: false })
    .limit(FETCH_LIMIT);

  if (error) {
    log.error("open demand fetch failed", { error: error.message });
    return [];
  }
  return (data ?? []) as DemandSourceRow[];
}

interface AcceptedRow {
  budget_band: string | null;
}

/**
 * Recently-accepted public briefs (last 90 days) — band column only.
 * Feeds the earnings estimator's "median accepted budget" anchor.
 * Matches both marketplace flows: auctions that were awarded and
 * accept-flow briefs with a stamped `accepted_at`.
 */
async function fetchAcceptedSample(): Promise<AcceptedSample> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - ACCEPTED_WINDOW_DAYS * DAY_MS).toISOString();
  const { data, error } = await supabase
    .from("advisor_auctions")
    .select("budget_band")
    .eq("is_public", true)
    .or("status.eq.awarded,accepted_at.not.is.null")
    .gte("created_at", cutoff)
    .limit(FETCH_LIMIT);

  if (error) {
    log.error("accepted sample fetch failed", { error: error.message });
    return { count: 0, medianBand: null };
  }
  const rows = (data ?? []) as AcceptedRow[];
  return {
    count: rows.length,
    medianBand: medianBudgetBand(rows.map((r) => r.budget_band)),
  };
}

/** Full payload for /for-advisors/demand. Never throws — degrades to empty. */
export async function getDemandBoardData(): Promise<DemandBoardData> {
  try {
    const [openRows, accepted] = await Promise.all([fetchOpenDemandRows(), fetchAcceptedSample()]);
    return {
      snapshot: aggregateDemand(openRows),
      accepted,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    log.error("demand board build failed", { err: err instanceof Error ? err.message : String(err) });
    return emptyDemandBoardData();
  }
}

/**
 * Cheap head-count of live public demand for teaser links (e.g. the
 * /for-advisors banner). Returns 0 on any error.
 */
export async function countOpenDemand(): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("advisor_auctions")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)
      .eq("status", "open")
      .gt("ends_at", new Date().toISOString())
      .in("risk_review_status", ["clear", "approved"]);
    if (error) {
      log.warn("open demand count failed", { error: error.message });
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    log.warn("open demand count threw", { err: err instanceof Error ? err.message : String(err) });
    return 0;
  }
}
