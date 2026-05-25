/**
 * My Saves Hub — assembly helper.
 *
 * Pure function: takes the five raw data sets fetched by the hub page
 * and returns a typed view-model ready for rendering. No DB calls, no
 * side-effects — everything is unit-testable without a mock surface.
 *
 * The five save types:
 *   1. Bookmarks     — articles, brokers, advisors, scenarios, calculators
 *   2. Watchlist     — watched broker / product items
 *   3. Comparisons   — named saved broker comparisons
 *   4. Saved searches — filter snapshots with email-alert frequencies
 *   5. Rate alerts   — threshold-based notifications from rate_alert_subscriptions
 */

import type { BookmarkRow } from "@/lib/bookmarks";

// ── Minimal shapes pulled from each per-type page ─────────────────────────────

export interface WatchlistItem {
  id: number;
  item_type: string;
  item_slug: string;
  display_name: string | null;
  added_at: string;
}

export interface SavedComparisonItem {
  id: string;
  name: string;
  broker_slugs: string[];
  created_at: string;
}

export interface SavedSearchItem {
  id: number;
  kind: string;
  label: string;
  email_frequency: string;
  created_at: string;
}

export interface RateAlertItem {
  id: string;
  metric_kind: string | null;
  product_kind: string;
  threshold_bps: number;
  direction: string;
  broker_slug: string | null;
  verified: boolean;
  created_at: string | null;
}

// ── Hub view-model ─────────────────────────────────────────────────────────────

/** One section in the hub, generic over the item shape. */
export interface HubSection<T> {
  /** Total items the user has for this type. */
  count: number;
  /** Most-recent N items (controlled by RECENT_COUNT). */
  recent: T[];
}

/** The shape the hub page renders. */
export interface MySavesHubViewModel {
  bookmarks: HubSection<Pick<BookmarkRow, "id" | "bookmark_type" | "ref" | "label" | "created_at">>;
  watchlist: HubSection<WatchlistItem>;
  comparisons: HubSection<SavedComparisonItem>;
  savedSearches: HubSection<SavedSearchItem>;
  rateAlerts: HubSection<RateAlertItem>;
  /** True when every section has count === 0. */
  isEmpty: boolean;
}

/** How many items to surface in each section's preview strip. */
export const RECENT_COUNT = 3;

// ── Raw inputs ─────────────────────────────────────────────────────────────────

export interface MySavesHubInputs {
  bookmarks: BookmarkRow[];
  watchlistItems: WatchlistItem[];
  comparisons: SavedComparisonItem[];
  savedSearches: SavedSearchItem[];
  rateAlerts: RateAlertItem[];
}

// ── Assembly ───────────────────────────────────────────────────────────────────

/**
 * Assemble the hub view-model from five pre-fetched data sets.
 *
 * Each data set is assumed to arrive newest-first from its respective
 * fetch helper (all five existing helpers already order by created_at
 * descending). The helper slices the first RECENT_COUNT items — it does
 * NOT re-sort, so the caller must pass already-sorted arrays for the
 * "most-recent" guarantee to hold.
 */
export function buildMySavesHubViewModel(
  inputs: MySavesHubInputs,
): MySavesHubViewModel {
  const bookmarks: MySavesHubViewModel["bookmarks"] = {
    count: inputs.bookmarks.length,
    recent: inputs.bookmarks.slice(0, RECENT_COUNT).map((b) => ({
      id: b.id,
      bookmark_type: b.bookmark_type,
      ref: b.ref,
      label: b.label,
      created_at: b.created_at,
    })),
  };

  const watchlist: MySavesHubViewModel["watchlist"] = {
    count: inputs.watchlistItems.length,
    recent: inputs.watchlistItems.slice(0, RECENT_COUNT),
  };

  const comparisons: MySavesHubViewModel["comparisons"] = {
    count: inputs.comparisons.length,
    recent: inputs.comparisons.slice(0, RECENT_COUNT),
  };

  const savedSearches: MySavesHubViewModel["savedSearches"] = {
    count: inputs.savedSearches.length,
    recent: inputs.savedSearches.slice(0, RECENT_COUNT),
  };

  const rateAlerts: MySavesHubViewModel["rateAlerts"] = {
    count: inputs.rateAlerts.length,
    recent: inputs.rateAlerts.slice(0, RECENT_COUNT),
  };

  const isEmpty =
    bookmarks.count === 0 &&
    watchlist.count === 0 &&
    comparisons.count === 0 &&
    savedSearches.count === 0 &&
    rateAlerts.count === 0;

  return { bookmarks, watchlist, comparisons, savedSearches, rateAlerts, isEmpty };
}
