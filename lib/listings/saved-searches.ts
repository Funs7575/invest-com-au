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

/** Raw saved filters — URL-param strings, all optional. */
export type InvestSearchFilters = Partial<
  Record<"category" | "sub" | "state" | "price" | "kind" | "firb" | "q", string>
>;

/** The slice of an investment_listings row the matcher needs. */
export interface MatchableListing {
  vertical: string;
  sub_category?: string | null;
  listing_kind?: string | null;
  location_state?: string | null;
  asking_price_cents?: number | null;
  firb_eligible?: boolean | null;
  title?: string | null;
  description?: string | null;
  key_metrics?: Record<string, unknown> | null;
}

/** Narrow unknown jsonb into the filters shape (drops non-string values). */
export function parseInvestFilters(raw: unknown): InvestSearchFilters {
  if (!raw || typeof raw !== "object") return {};
  const out: InvestSearchFilters = {};
  for (const key of ["category", "sub", "state", "price", "kind", "firb", "q"] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim() !== "") out[key] = value.trim();
  }
  return out;
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
      const price = listing.asking_price_cents;
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
  if (filters.q) {
    const haystack = `${listing.title ?? ""} ${listing.description ?? ""}`.toLowerCase();
    if (!haystack.includes(filters.q.toLowerCase())) return false;
  }
  return true;
}

/** Stable signature of a matched-id set — `last_match_signature` dedupe. */
export function matchSignature(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join(",");
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
