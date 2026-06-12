/**
 * Brief intelligence dossiers — pure data composition over existing tables.
 *
 * Turns a masked brief in the adviser inbox into an intelligence dossier:
 *
 *   (a) Location context — postcode/suburb enrichment from the in-house
 *       `suburb_data` + `au_postcodes` tables (median prices, growth,
 *       yield, vacancy), resolved from the brief's state and any
 *       `target_location` free text in the payload.
 *   (b) Similar-brief market stats — accept-flow history from
 *       `advisor_auctions` (same template, same state when the sample
 *       allows): median time-to-accept, accept rate, typical accepted
 *       budget band. Suppressed below SIMILAR_BRIEFS_MIN_SAMPLE.
 *   (c) The calling adviser's own track record — their bids on
 *       category-matching auctions (`advisor_auction_bids`) plus their
 *       accepted same-template briefs. Win rate suppressed below
 *       TRACK_RECORD_MIN_SAMPLE decided bids.
 *   (d) Quality band — the deterministic brief-strength tier
 *       (`lib/briefs/brief-strength.ts`) computed from the SAME masked
 *       fields the inbox already shows the adviser. We deliberately do
 *       NOT read `lead_quality_weights` (service-role-only ranking
 *       weights, commercially sensitive, never adviser-facing) or the
 *       internal `ai_quality_score` — the band is a presentation of
 *       data the adviser can already see, so it leaks nothing new.
 *
 * Privacy / tone guard: everything here is aggregate and anonymised.
 * No adviser identities, no individual bid amounts, no consumer PII.
 * All copy derived from this module must stay informational ("similar
 * briefs…", "your win rate…") — never pressure mechanics.
 *
 * Per-request memoisation: `getBriefDossier` is wrapped in React's
 * cache() (same pattern as lib/request-cache.ts) so repeated calls in
 * one request dedupe. The inbox itself never bulk-fetches dossiers —
 * the lazy /api/briefs/[slug]/dossier endpoint loads exactly one per
 * expand, so there is no N+1 on inbox render.
 */

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- cross-user marketplace aggregates: similar-brief stats and category bid history span other advisers' auctions/bids (no anon or authenticated SELECT policy covers historical accept-flow rows), and legacy advisor_session cookies carry no Supabase JWT. Read-only aggregate queries; outputs are anonymised summaries. See CLAUDE.md § "Two Supabase clients".
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { QUOTE_BUDGET_BANDS } from "@/lib/api-schemas";
import { scoreBriefStrength, type StrengthTier } from "@/lib/briefs/brief-strength";
import { maskBriefForProvider } from "@/lib/briefs/mask";
import {
  BRIEF_TEMPLATE_FIELDS,
  BRIEF_TEMPLATE_LABELS,
} from "@/lib/briefs/templates";
import type { BriefRow, BriefTemplate } from "@/lib/briefs/types";

const log = logger("brief-intel");

// ─── Tunables (exported so tests pin the suppression contract) ──────────

/** Similar-brief market stats need at least this many decided briefs. */
export const SIMILAR_BRIEFS_MIN_SAMPLE = 5;
/** Medians over accepted briefs need at least this many accepted rows. */
export const ACCEPTED_MEDIAN_MIN_SAMPLE = 3;
/** Adviser win rate needs at least this many decided (won/lost) bids. */
export const TRACK_RECORD_MIN_SAMPLE = 3;
/** History window for similar-brief and bid-history queries. */
export const INTEL_WINDOW_DAYS = 180;

const FETCH_LIMIT = 500;

// Display labels live in brief-intel-shared.ts (client-safe — the dossier
// panel renders them in the browser; importing this module there would pull
// the server Supabase clients into the client bundle). Re-exported so server
// callers and tests keep a single import surface.
export { BUDGET_BAND_LABELS } from "./brief-intel-shared";

// ─── Types ───────────────────────────────────────────────────────────────

export interface DossierLocationContext {
  state: string | null;
  suburb: string | null;
  postcode: string | null;
  /** Localities sharing the postcode (from au_postcodes), capped at 6. */
  localities: string[];
  medianHousePrice: number | null;
  medianUnitPrice: number | null;
  rentalYieldHousePct: number | null;
  rentalYieldUnitPct: number | null;
  vacancyRatePct: number | null;
  capitalGrowthPct: number | null;
  /** Which growth window capitalGrowthPct refers to. */
  capitalGrowthWindow: "5y" | "3y" | "1y" | null;
  population: number | null;
  distanceToCbdKm: number | null;
  dataDate: string | null;
}

export interface SimilarBriefStats {
  /** Decided briefs (accepted, or closed without acceptance) in the window. */
  sampleSize: number;
  acceptedCount: number;
  windowDays: number;
  /** Whether the sample was same-state or had to widen to national. */
  scope: "state" | "national";
  state: string | null;
  templateLabel: string;
  /** Median hours from posting to acceptance. Null below ACCEPTED_MEDIAN_MIN_SAMPLE. */
  medianHoursToAccept: number | null;
  acceptRatePct: number;
  /** Median budget band among accepted briefs. Null below ACCEPTED_MEDIAN_MIN_SAMPLE. */
  typicalAcceptedBudgetBand: string | null;
}

export interface AdviserTrackRecord {
  windowDays: number;
  /** Bids the adviser placed on category-matching auctions in the window. */
  categoryBidCount: number;
  /** Of those, decided (won or lost). */
  decidedBidCount: number;
  /** Null below TRACK_RECORD_MIN_SAMPLE decided bids. */
  categoryWinRatePct: number | null;
  /** Accept-flow briefs of the same template this adviser accepted (all time). */
  acceptedSimilarCount: number;
  /** Of those, tracker_status = won. */
  engagedSimilarCount: number;
}

export interface DossierQualityBand {
  tier: StrengthTier;
  label: string;
}

export interface ResponseWindowSuggestion {
  /** Suggested "respond within" window, hours. */
  windowHours: number;
  /** The market median it was derived from, hours (1 d.p.). */
  medianHoursToAccept: number;
}

export interface BriefDossier {
  briefId: number;
  slug: string;
  generatedAt: string;
  location: DossierLocationContext | null;
  similar: SimilarBriefStats | null;
  trackRecord: AdviserTrackRecord | null;
  quality: DossierQualityBand | null;
  responseWindow: ResponseWindowSuggestion | null;
}

// ─── Pure helpers (unit-tested without a DB) ─────────────────────────────

/** Median of a numeric array (even length → mean of middle pair). Null when empty. */
export function medianOf(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const a = sorted[mid];
  if (a === undefined) return null;
  if (sorted.length % 2 === 1) return a;
  const b = sorted[mid - 1];
  return b === undefined ? a : (a + b) / 2;
}

/**
 * Extract an Australian postcode (0200–9999) from free text.
 * Takes the LAST standalone 4-digit token — location strings conventionally
 * end with the postcode ("Parramatta NSW 2150"). Known caveat: bare years
 * ("2026") collide with valid postcodes; acceptable for a context hint.
 */
export function extractPostcode(text: string | null | undefined): string | null {
  if (!text) return null;
  const matches = text.match(/(?<!\d)\d{4}(?!\d)/g);
  if (!matches) return null;
  for (let i = matches.length - 1; i >= 0; i--) {
    const candidate = matches[i];
    if (!candidate) continue;
    const n = Number(candidate);
    if (n >= 200 && n <= 9999) return candidate;
  }
  return null;
}

const AU_STATE_TOKEN =
  /\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT|New South Wales|Victoria|Queensland|Western Australia|South Australia|Tasmania|Northern Territory)\b/gi;

const STATE_NAME_TO_CODE: Record<string, string> = {
  "new south wales": "NSW",
  victoria: "VIC",
  queensland: "QLD",
  "western australia": "WA",
  "south australia": "SA",
  tasmania: "TAS",
  "northern territory": "NT",
};

export interface ParsedTargetLocation {
  postcode: string | null;
  /** Candidate suburb phrase, cleaned of postcode/state tokens. */
  phrase: string | null;
  /** State mentioned inside the text itself (may differ from the brief's state). */
  stateHint: string | null;
}

/**
 * Parse a free-text target location ("Parramatta NSW 2150",
 * "Brisbane inner suburbs") into postcode / suburb-phrase / state hints.
 */
export function parseTargetLocation(
  text: string | null | undefined,
): ParsedTargetLocation {
  const raw = (text ?? "").trim();
  if (!raw) return { postcode: null, phrase: null, stateHint: null };

  const postcode = extractPostcode(raw);

  let stateHint: string | null = null;
  const stateMatch = raw.match(AU_STATE_TOKEN);
  const firstState = stateMatch?.[0];
  if (firstState) {
    const lower = firstState.toLowerCase();
    stateHint = STATE_NAME_TO_CODE[lower] ?? firstState.toUpperCase();
  }

  let cleaned = raw.replace(AU_STATE_TOKEN, " ");
  if (postcode) cleaned = cleaned.replace(postcode, " ");
  const firstSegment = cleaned.split(/[,;/]/)[0] ?? "";
  const phrase = firstSegment.replace(/[^\p{L}\p{N}'\- ]/gu, " ").replace(/\s+/g, " ").trim();

  return {
    postcode,
    phrase: phrase.length >= 3 ? phrase : null,
    stateHint,
  };
}

/**
 * Median budget band across accepted briefs, along the canonical
 * QUOTE_BUDGET_BANDS order. "not_sure" and unknown values are excluded.
 */
export function medianBudgetBand(
  bands: readonly (string | null | undefined)[],
): string | null {
  const order = QUOTE_BUDGET_BANDS as readonly string[];
  const indices = bands
    .map((b) => (b && b !== "not_sure" ? order.indexOf(b) : -1))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (indices.length === 0) return null;
  const idx = indices[Math.floor((indices.length - 1) / 2)];
  if (idx === undefined) return null;
  return order[idx] ?? null;
}

export interface SimilarBriefRowLite {
  id: number;
  created_at: string;
  accepted_at: string | null;
  status: string;
  budget_band: string | null;
  location: string | null;
}

/**
 * Summarise a set of similar accept-flow briefs into market stats.
 * Returns null when fewer than SIMILAR_BRIEFS_MIN_SAMPLE decided briefs.
 */
export function summariseSimilarBriefs(
  rows: readonly SimilarBriefRowLite[],
  scope: "state" | "national",
  state: string | null,
  templateLabel: string,
): SimilarBriefStats | null {
  const decided = rows.filter(
    (r) => r.accepted_at != null || r.status !== "open",
  );
  if (decided.length < SIMILAR_BRIEFS_MIN_SAMPLE) return null;

  const accepted = decided.filter((r) => r.accepted_at != null);

  let medianHoursToAccept: number | null = null;
  if (accepted.length >= ACCEPTED_MEDIAN_MIN_SAMPLE) {
    const hours = accepted
      .map((r) => {
        const ms =
          new Date(r.accepted_at as string).getTime() -
          new Date(r.created_at).getTime();
        return ms / 3_600_000;
      })
      .filter((h) => Number.isFinite(h) && h >= 0);
    const med = medianOf(hours);
    medianHoursToAccept = med === null ? null : Math.round(med * 10) / 10;
  }

  const bandSample = accepted
    .map((r) => r.budget_band)
    .filter((b): b is string => Boolean(b) && b !== "not_sure");
  const typicalAcceptedBudgetBand =
    bandSample.length >= ACCEPTED_MEDIAN_MIN_SAMPLE
      ? medianBudgetBand(bandSample)
      : null;

  return {
    sampleSize: decided.length,
    acceptedCount: accepted.length,
    windowDays: INTEL_WINDOW_DAYS,
    scope,
    state: scope === "state" ? state : null,
    templateLabel,
    medianHoursToAccept,
    acceptRatePct: Math.round((accepted.length / decided.length) * 100),
    typicalAcceptedBudgetBand,
  };
}

export interface TrackRecordBidLite {
  status: string;
  advisor_auctions: { advisor_types: string[] | null } | null;
}

/**
 * Summarise the adviser's own bid history against a brief's category
 * (advisor_types overlap). Win rate suppressed below
 * TRACK_RECORD_MIN_SAMPLE decided bids.
 */
export function summariseTrackRecord(
  bids: readonly TrackRecordBidLite[],
  briefAdvisorTypes: readonly string[] | null,
  acceptedSimilar: readonly { tracker_status: string | null }[],
): AdviserTrackRecord {
  const wantTypes = (briefAdvisorTypes ?? []).filter(Boolean);
  const categoryBids = bids.filter((b) => {
    if (wantTypes.length === 0) return true;
    const auctionTypes = b.advisor_auctions?.advisor_types ?? null;
    if (!auctionTypes || auctionTypes.length === 0) return false;
    return auctionTypes.some((t) => wantTypes.includes(t));
  });

  const won = categoryBids.filter((b) => b.status === "won").length;
  const lost = categoryBids.filter((b) => b.status === "lost").length;
  const decided = won + lost;

  return {
    windowDays: INTEL_WINDOW_DAYS,
    categoryBidCount: categoryBids.length,
    decidedBidCount: decided,
    categoryWinRatePct:
      decided >= TRACK_RECORD_MIN_SAMPLE
        ? Math.round((won / decided) * 100)
        : null,
    acceptedSimilarCount: acceptedSimilar.length,
    engagedSimilarCount: acceptedSimilar.filter(
      (r) => r.tracker_status === "won",
    ).length,
  };
}

/**
 * Suggested "respond within" window from a market median time-to-accept:
 * half the median, clamped to [2h, 24h]. Purely informational — UI copy
 * must frame it as a nudge, never a pressure mechanic.
 */
export function suggestedResponseWindow(
  medianHoursToAccept: number | null | undefined,
): ResponseWindowSuggestion | null {
  if (medianHoursToAccept == null || !Number.isFinite(medianHoursToAccept)) {
    return null;
  }
  if (medianHoursToAccept <= 0) return null;
  const windowHours = Math.min(24, Math.max(2, Math.ceil(medianHoursToAccept / 2)));
  return {
    windowHours,
    medianHoursToAccept: Math.round(medianHoursToAccept * 10) / 10,
  };
}

/**
 * Quality band for a brief, computed from the SAME masked fields the
 * inbox already shows advisers (title, 280-char preview, budget band,
 * state, structured payload). Returns the tier + label only — never the
 * raw score, never internal ranking weights.
 */
export function qualityBandForBrief(row: BriefRow): DossierQualityBand {
  const masked = maskBriefForProvider(row);
  const template = masked.brief_template;
  const fields = template ? BRIEF_TEMPLATE_FIELDS[template] ?? [] : [];
  const { tier, label } = scoreBriefStrength({
    title: masked.job_title ?? "",
    description: masked.description_preview ?? "",
    budgetBand: masked.budget_band ?? "",
    locationState: masked.location ?? "",
    payload: masked.brief_payload ?? {},
    fields,
  });
  return { tier, label };
}

// ─── Data access (degrades per-section: any failure → null + warn) ──────

interface SuburbDataRow {
  suburb: string;
  state: string;
  postcode: string | null;
  median_price_house: number | null;
  median_price_unit: number | null;
  rental_yield_house: number | null;
  rental_yield_unit: number | null;
  vacancy_rate: number | null;
  capital_growth_1yr: number | null;
  capital_growth_3yr: number | null;
  capital_growth_5yr: number | null;
  population: number | null;
  distance_to_cbd_km: number | null;
  data_date: string | null;
}

const SUBURB_COLUMNS =
  "suburb, state, postcode, median_price_house, median_price_unit, rental_yield_house, rental_yield_unit, vacancy_rate, capital_growth_1yr, capital_growth_3yr, capital_growth_5yr, population, distance_to_cbd_km, data_date";

function toLocationContext(
  row: SuburbDataRow | null,
  fallback: { state: string | null; postcode: string | null },
  localities: string[],
): DossierLocationContext {
  const growth = row
    ? row.capital_growth_5yr != null
      ? { pct: Number(row.capital_growth_5yr), window: "5y" as const }
      : row.capital_growth_3yr != null
        ? { pct: Number(row.capital_growth_3yr), window: "3y" as const }
        : row.capital_growth_1yr != null
          ? { pct: Number(row.capital_growth_1yr), window: "1y" as const }
          : null
    : null;

  return {
    state: row?.state ?? fallback.state,
    suburb: row?.suburb ?? null,
    postcode: row?.postcode ?? fallback.postcode,
    localities,
    medianHousePrice: row?.median_price_house ?? null,
    medianUnitPrice: row?.median_price_unit ?? null,
    rentalYieldHousePct:
      row?.rental_yield_house != null ? Number(row.rental_yield_house) : null,
    rentalYieldUnitPct:
      row?.rental_yield_unit != null ? Number(row.rental_yield_unit) : null,
    vacancyRatePct: row?.vacancy_rate != null ? Number(row.vacancy_rate) : null,
    capitalGrowthPct: growth?.pct ?? null,
    capitalGrowthWindow: growth?.window ?? null,
    population: row?.population ?? null,
    distanceToCbdKm:
      row?.distance_to_cbd_km != null ? Number(row.distance_to_cbd_km) : null,
    dataDate: row?.data_date ?? null,
  };
}

/**
 * Resolve location context for a brief from its state + free-text target
 * location. Reads public tables (suburb_data, au_postcodes — anon SELECT
 * policies) via the cookie-scoped server client.
 */
async function fetchLocationContext(
  state: string | null,
  targetLocationText: string | null,
): Promise<DossierLocationContext | null> {
  const { postcode, phrase, stateHint } = parseTargetLocation(targetLocationText);
  const effectiveState = stateHint ?? state;
  if (!postcode && !phrase && !effectiveState) return null;

  try {
    const supabase = await createClient();

    let suburbRow: SuburbDataRow | null = null;
    let localities: string[] = [];

    if (postcode) {
      const [{ data: pcRows }, { data: suburbRows }] = await Promise.all([
        supabase
          .from("au_postcodes")
          .select("locality, state")
          .eq("postcode", postcode)
          .limit(8),
        supabase
          .from("suburb_data")
          .select(SUBURB_COLUMNS)
          .eq("postcode", postcode)
          .order("population", { ascending: false, nullsFirst: false })
          .limit(6),
      ]);
      localities = (pcRows ?? [])
        .map((r) => r.locality as string)
        .filter(Boolean)
        .slice(0, 6);
      const rows = (suburbRows ?? []) as unknown as SuburbDataRow[];
      // Prefer the row matching the suburb phrase, else the most populous.
      suburbRow =
        (phrase &&
          rows.find((r) => r.suburb.toLowerCase() === phrase.toLowerCase())) ||
        rows[0] ||
        null;
    } else if (phrase) {
      let query = supabase
        .from("suburb_data")
        .select(SUBURB_COLUMNS)
        .ilike("suburb", phrase)
        .order("population", { ascending: false, nullsFirst: false })
        .limit(2);
      if (effectiveState) query = query.eq("state", effectiveState);
      const { data: exactRows } = await query;
      let rows = (exactRows ?? []) as unknown as SuburbDataRow[];
      if (rows.length === 0) {
        let prefix = supabase
          .from("suburb_data")
          .select(SUBURB_COLUMNS)
          .ilike("suburb", `${phrase}%`)
          .order("population", { ascending: false, nullsFirst: false })
          .limit(2);
        if (effectiveState) prefix = prefix.eq("state", effectiveState);
        const { data: prefixRows } = await prefix;
        rows = (prefixRows ?? []) as unknown as SuburbDataRow[];
      }
      suburbRow = rows[0] ?? null;
    }

    if (!suburbRow && !effectiveState && localities.length === 0) return null;
    return toLocationContext(
      suburbRow,
      { state: effectiveState, postcode },
      localities,
    );
  } catch (err) {
    log.warn("location context lookup failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    // Degrade to state-only context rather than dropping the section.
    return effectiveState
      ? toLocationContext(null, { state: effectiveState, postcode }, [])
      : null;
  }
}

async function fetchSimilarStats(
  brief: Pick<BriefRow, "id" | "brief_template" | "location">,
): Promise<SimilarBriefStats | null> {
  const template = brief.brief_template;
  if (!template) return null;
  try {
    const admin = createAdminClient();
    const sinceIso = new Date(
      Date.now() - INTEL_WINDOW_DAYS * 86_400_000,
    ).toISOString();
    const { data } = await admin
      .from("advisor_auctions")
      .select("id, created_at, accepted_at, status, budget_band, location")
      .eq("flow_type", "accept")
      .eq("brief_template", template)
      .in("risk_review_status", ["clear", "approved"])
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(FETCH_LIMIT);

    const rows = ((data ?? []) as unknown as SimilarBriefRowLite[]).filter(
      (r) => r.id !== brief.id,
    );
    const templateLabel =
      BRIEF_TEMPLATE_LABELS[template as BriefTemplate] ?? template;

    if (brief.location) {
      const stateRows = rows.filter((r) => r.location === brief.location);
      const stateStats = summariseSimilarBriefs(
        stateRows,
        "state",
        brief.location,
        templateLabel,
      );
      if (stateStats) return stateStats;
    }
    return summariseSimilarBriefs(rows, "national", null, templateLabel);
  } catch (err) {
    log.warn("similar-brief stats failed", {
      briefId: brief.id,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function fetchTrackRecord(
  advisorId: number,
  brief: Pick<BriefRow, "id" | "brief_template" | "advisor_types">,
): Promise<AdviserTrackRecord | null> {
  try {
    const admin = createAdminClient();
    const sinceIso = new Date(
      Date.now() - INTEL_WINDOW_DAYS * 86_400_000,
    ).toISOString();

    const bidsPromise = admin
      .from("advisor_auction_bids")
      .select("status, advisor_auctions:auction_id ( advisor_types )")
      .eq("advisor_id", advisorId)
      .gte("created_at", sinceIso)
      .limit(FETCH_LIMIT);

    const acceptedPromise = brief.brief_template
      ? admin
          .from("advisor_auctions")
          .select("tracker_status")
          .eq("flow_type", "accept")
          .eq("accepted_by_professional_id", advisorId)
          .eq("brief_template", brief.brief_template)
          .neq("id", brief.id)
          .limit(200)
      : Promise.resolve({ data: [] as { tracker_status: string | null }[] });

    const [{ data: bidsRaw }, { data: acceptedRaw }] = await Promise.all([
      bidsPromise,
      acceptedPromise,
    ]);

    return summariseTrackRecord(
      (bidsRaw ?? []) as unknown as TrackRecordBidLite[],
      brief.advisor_types ?? null,
      (acceptedRaw ?? []) as { tracker_status: string | null }[],
    );
  } catch (err) {
    log.warn("track record lookup failed", {
      advisorId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─── Composer ────────────────────────────────────────────────────────────

async function getBriefDossierUncached(
  slug: string,
  advisorId: number,
): Promise<BriefDossier | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("advisor_auctions")
    .select("*")
    .eq("slug", slug)
    .eq("flow_type", "accept")
    .maybeSingle();
  if (!data) return null;
  const brief = data as unknown as BriefRow;

  // Risk-held briefs expose nothing beyond the preview stub.
  if (
    brief.risk_review_status !== "clear" &&
    brief.risk_review_status !== "approved"
  ) {
    return null;
  }

  const targetLocation =
    typeof brief.brief_payload?.target_location === "string"
      ? brief.brief_payload.target_location
      : null;

  const [location, similar, trackRecord] = await Promise.all([
    fetchLocationContext(brief.location, targetLocation),
    fetchSimilarStats(brief),
    fetchTrackRecord(advisorId, brief),
  ]);

  return {
    briefId: brief.id,
    slug: brief.slug,
    generatedAt: new Date().toISOString(),
    location,
    similar,
    trackRecord,
    quality: qualityBandForBrief(brief),
    responseWindow: suggestedResponseWindow(similar?.medianHoursToAccept),
  };
}

/**
 * Per-request memoised dossier composer. Outside a React request scope
 * (e.g. unit tests) cache() falls through to the raw function.
 */
export const getBriefDossier = cache(getBriefDossierUncached);
