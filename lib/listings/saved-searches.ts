/**
 * Saved-search matcher for marketplace alert emails.
 *
 * The `saved_searches` table (kind='invest') stores the /invest browse
 * surface's RAW URL params as `filters` — `category`, `sub`, `state`,
 * `price` (ticket-bucket key), `kind` (comma-list of listing kinds),
 * `firb` ("eligible"), `q`. This module interprets that exact vocabulary
 * server-side so the saved search matches precisely what the user saw
 * when they saved it (InvestListingsClient is the SSOT for the keys).
 *
 * The matcher is pure and total: rows with missing fields fail the
 * specific check rather than throwing, and ticket-banded searches never
 * match price-on-application rows (an alert promising "$100k – $1M" must
 * not fire on an undisclosed price).
 */

import { categoryForListing } from "@/lib/listing-url";
import { deriveListingKind, ticketBucketByKey } from "@/lib/listing-kind";
import {
  canonicalEnumValue,
  metricNumber,
  metricNumberByDef,
  metricsForCategory,
  normaliseEnumToken,
  type VerticalMetricDef,
} from "@/lib/listings/vertical-metrics";

/** Raw saved filters — URL-param strings, all optional. `metrics` carries
 *  any registry facet params (`m_<key>`), interpreted by value shape. */
export type InvestSearchFilters = Partial<
  Record<
    "category" | "sub" | "state" | "price" | "kind" | "firb" | "siv" | "wholesale" | "investor" | "q",
    string
  >
> & { metrics?: Record<string, string> };

/** The slice of an investment_listings row the matcher needs. */
export interface MatchableListing {
  vertical: string;
  sub_category?: string | null;
  listing_kind?: string | null;
  location_state?: string | null;
  asking_price_cents?: number | null;
  firb_eligible?: boolean | null;
  siv_complying?: boolean | null;
  title?: string | null;
  description?: string | null;
  key_metrics?: Record<string, unknown> | null;
}

/** Narrow unknown jsonb into the filters shape (drops non-string values). */
export function parseInvestFilters(raw: unknown): InvestSearchFilters {
  if (!raw || typeof raw !== "object") return {};
  const out: InvestSearchFilters = {};
  for (const key of [
    "category", "sub", "state", "price", "kind", "firb", "siv", "wholesale", "investor", "q",
  ] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim() !== "") out[key] = value.trim();
  }
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key.startsWith("m_") && typeof value === "string" && value.trim() !== "") {
      (out.metrics ??= {})[key.slice(2)] = value.trim();
    }
  }
  return out;
}

/** The ticket figure the browse surface ranks on: asking price, falling
 *  back to a disclosed minimum investment (AUD keys are dollars; the
 *  cents key is cents). Mirrors InvestListingsClient's ticket pipeline so
 *  alerts match what the user saw when they saved the filter. */
export function listingTicketCents(listing: MatchableListing): number | null {
  if (listing.asking_price_cents != null && listing.asking_price_cents > 0) {
    return listing.asking_price_cents;
  }
  const km = (listing.key_metrics ?? {}) as Record<string, unknown>;
  for (const audKey of ["min_investment_aud", "min_commit_aud"]) {
    const n = Number(km[audKey]);
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100);
  }
  const cents = Number(km["min_investment_cents"]);
  if (Number.isFinite(cents) && cents > 0) return Math.round(cents);
  return null;
}

function isWholesaleOnly(km: Record<string, unknown>): boolean {
  return km["wholesale_only"] === true || km["s708_required"] === true || km["accredited_only"] === true;
}

/** Interpret one saved `m_<key>` facet by value shape: "lo-hi" numeric
 *  range, "1" toggle, otherwise CSV membership. The registry def (when the
 *  category resolves one) makes the comparison vocabulary-aware: currency
 *  metrics parse legacy "$680,000" strings to cents, and enum membership
 *  canonicalises both sides through the option aliases so synonym rows
 *  ("producer" vs "production") still match. */
function matchesMetricParam(
  km: Record<string, unknown>,
  key: string,
  raw: string,
  def?: VerticalMetricDef,
): boolean {
  const v = km[key];
  const range = raw.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (range) {
    const n = def ? metricNumberByDef(def, v) : metricNumber(v);
    return n != null && n >= Number(range[1]) && n <= Number(range[2]);
  }
  if (raw === "1") return v === true || v === "true";
  const canonicalToken = (token: string): string =>
    (def ? canonicalEnumValue(def, token) : null) ?? normaliseEnumToken(token);
  const wanted = new Set(raw.split(",").map(canonicalToken).filter(Boolean));
  return wanted.has(canonicalToken(String(v ?? "")));
}

export function matchesInvestFilters(
  listing: MatchableListing,
  filters: InvestSearchFilters,
): boolean {
  if (filters.category && filters.category !== "all") {
    if (categoryForListing(listing) !== filters.category) return false;
  }
  if (filters.sub) {
    if ((listing.sub_category ?? "") !== filters.sub) return false;
  }
  if (filters.state) {
    if ((listing.location_state ?? "").toUpperCase() !== filters.state.toUpperCase()) {
      return false;
    }
  }
  if (filters.price) {
    const bucket = ticketBucketByKey(filters.price);
    if (bucket.key !== "") {
      const price = listingTicketCents(listing);
      if (price == null) return false; // POA never satisfies a ticket band
      if (price < bucket.min || price >= bucket.max) return false;
    }
  }
  if (filters.kind) {
    const wanted = filters.kind.split(",").map((k) => k.trim()).filter(Boolean);
    if (wanted.length > 0 && !wanted.includes(deriveListingKind(listing))) return false;
  }
  if (filters.firb === "eligible") {
    if (!listing.firb_eligible) return false;
  }
  const km = (listing.key_metrics ?? {}) as Record<string, unknown>;
  if (filters.siv === "complying") {
    if (!listing.siv_complying) return false;
  }
  if (filters.wholesale === "true") {
    if (!isWholesaleOnly(km)) return false;
  }
  if (filters.investor === "retail") {
    if (isWholesaleOnly(km) && km["open_to_retail"] !== true) return false;
  }
  if (filters.metrics) {
    // Metric facets only render on category-locked browse pages, so the
    // saved category resolves the registry defs; a def-less key (stale
    // param, "all" category) falls back to shape-based matching.
    const defs =
      filters.category && filters.category !== "all"
        ? metricsForCategory(filters.category)
        : [];
    for (const [key, raw] of Object.entries(filters.metrics)) {
      if (!matchesMetricParam(km, key, raw, defs.find((d) => d.key === key))) return false;
    }
  }
  if (filters.q) {
    const haystack = `${listing.title ?? ""} ${listing.description ?? ""}`.toLowerCase();
    if (!haystack.includes(filters.q.toLowerCase())) return false;
  }
  return true;
}

/** Human summary for the email subject when the row has no label. */
export function describeInvestFilters(filters: InvestSearchFilters): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`“${filters.q}”`);
  if (filters.category && filters.category !== "all") {
    parts.push(filters.category.replace(/-/g, " "));
  }
  if (filters.kind) parts.push(filters.kind.split(",")[0]!.replace(/_/g, " "));
  if (filters.state) parts.push(`in ${filters.state.toUpperCase()}`);
  if (filters.price) {
    const bucket = ticketBucketByKey(filters.price);
    if (bucket.key !== "") parts.push(bucket.label);
  }
  if (filters.firb === "eligible") parts.push("FIRB-eligible");
  return parts.length > 0 ? parts.join(" · ") : "All new listings";
}
