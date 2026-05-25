/**
 * Unit tests for lib/my-saves-hub.ts — buildMySavesHubViewModel.
 *
 * All tests are pure: no DB, no mocks, no async. The helper takes five
 * in-memory arrays and returns a view-model.
 */

import { describe, it, expect } from "vitest";
import {
  buildMySavesHubViewModel,
  RECENT_COUNT,
  type MySavesHubInputs,
} from "@/lib/my-saves-hub";
import type { BookmarkRow } from "@/lib/bookmarks";

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeBookmark(n: number): BookmarkRow {
  return {
    id: n,
    user_id: "user-1",
    bookmark_type: "article",
    ref: `article-${n}`,
    label: `Article ${n}`,
    note: null,
    created_at: new Date(2026, 0, n).toISOString(),
  };
}

function makeWatchlistItem(n: number) {
  return {
    id: n,
    item_type: "broker",
    item_slug: `broker-${n}`,
    display_name: `Broker ${n}`,
    added_at: new Date(2026, 0, n).toISOString(),
  };
}

function makeComparison(n: number) {
  return {
    id: `comp-${n}`,
    name: `Comparison ${n}`,
    broker_slugs: ["commsec", "stake"],
    created_at: new Date(2026, 0, n).toISOString(),
  };
}

function makeSavedSearch(n: number) {
  return {
    id: n,
    kind: "advisors" as const,
    label: `Search ${n}`,
    email_frequency: "weekly",
    created_at: new Date(2026, 0, n).toISOString(),
  };
}

function makeAlert(n: number) {
  return {
    id: `alert-${n}`,
    metric_kind: "savings_rate",
    product_kind: "savings_account",
    threshold_bps: 500,
    direction: "above",
    broker_slug: null,
    verified: true,
    created_at: new Date(2026, 0, n).toISOString(),
  };
}

const emptyInputs: MySavesHubInputs = {
  bookmarks: [],
  watchlistItems: [],
  comparisons: [],
  savedSearches: [],
  rateAlerts: [],
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("buildMySavesHubViewModel — all-empty input", () => {
  it("returns isEmpty = true when all five sets are empty", () => {
    const vm = buildMySavesHubViewModel(emptyInputs);
    expect(vm.isEmpty).toBe(true);
  });

  it("returns count = 0 and recent = [] for every section", () => {
    const vm = buildMySavesHubViewModel(emptyInputs);
    expect(vm.bookmarks.count).toBe(0);
    expect(vm.bookmarks.recent).toHaveLength(0);
    expect(vm.watchlist.count).toBe(0);
    expect(vm.watchlist.recent).toHaveLength(0);
    expect(vm.comparisons.count).toBe(0);
    expect(vm.comparisons.recent).toHaveLength(0);
    expect(vm.savedSearches.count).toBe(0);
    expect(vm.savedSearches.recent).toHaveLength(0);
    expect(vm.rateAlerts.count).toBe(0);
    expect(vm.rateAlerts.recent).toHaveLength(0);
  });
});

describe("buildMySavesHubViewModel — counts", () => {
  it("reflects the full length of each data set in count", () => {
    const vm = buildMySavesHubViewModel({
      bookmarks: [makeBookmark(1), makeBookmark(2), makeBookmark(3), makeBookmark(4), makeBookmark(5)],
      watchlistItems: [makeWatchlistItem(1), makeWatchlistItem(2)],
      comparisons: [makeComparison(1)],
      savedSearches: [makeSavedSearch(1), makeSavedSearch(2), makeSavedSearch(3), makeSavedSearch(4)],
      rateAlerts: [makeAlert(1), makeAlert(2), makeAlert(3), makeAlert(4), makeAlert(5), makeAlert(6)],
    });
    expect(vm.bookmarks.count).toBe(5);
    expect(vm.watchlist.count).toBe(2);
    expect(vm.comparisons.count).toBe(1);
    expect(vm.savedSearches.count).toBe(4);
    expect(vm.rateAlerts.count).toBe(6);
  });
});

describe("buildMySavesHubViewModel — recent slicing", () => {
  it(`returns at most RECENT_COUNT (${RECENT_COUNT}) items in each recent array`, () => {
    const many = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const vm = buildMySavesHubViewModel({
      bookmarks: many.map(makeBookmark),
      watchlistItems: many.map(makeWatchlistItem),
      comparisons: many.map(makeComparison),
      savedSearches: many.map(makeSavedSearch),
      rateAlerts: many.map(makeAlert),
    });
    expect(vm.bookmarks.recent.length).toBeLessThanOrEqual(RECENT_COUNT);
    expect(vm.watchlist.recent.length).toBeLessThanOrEqual(RECENT_COUNT);
    expect(vm.comparisons.recent.length).toBeLessThanOrEqual(RECENT_COUNT);
    expect(vm.savedSearches.recent.length).toBeLessThanOrEqual(RECENT_COUNT);
    expect(vm.rateAlerts.recent.length).toBeLessThanOrEqual(RECENT_COUNT);
  });

  it("preserves input order in the recent slice (first-in = most recent)", () => {
    // Inputs arrive newest-first from the helpers; slice should keep that order.
    const bookmarks = [makeBookmark(10), makeBookmark(9), makeBookmark(8), makeBookmark(7)];
    const vm = buildMySavesHubViewModel({ ...emptyInputs, bookmarks });
    expect(vm.bookmarks.recent[0]?.id).toBe(10);
    expect(vm.bookmarks.recent[1]?.id).toBe(9);
    expect(vm.bookmarks.recent[2]?.id).toBe(8);
  });

  it("returns exactly N items when input length equals RECENT_COUNT", () => {
    const bookmarks = Array.from({ length: RECENT_COUNT }, (_, i) => makeBookmark(i + 1));
    const vm = buildMySavesHubViewModel({ ...emptyInputs, bookmarks });
    expect(vm.bookmarks.recent).toHaveLength(RECENT_COUNT);
    expect(vm.bookmarks.count).toBe(RECENT_COUNT);
  });

  it("does not duplicate items between recent and count", () => {
    const bookmarks = [makeBookmark(1), makeBookmark(2)];
    const vm = buildMySavesHubViewModel({ ...emptyInputs, bookmarks });
    // recent is a strict subset, not a separate list
    expect(vm.bookmarks.count).toBe(2);
    expect(vm.bookmarks.recent).toHaveLength(2);
  });
});

describe("buildMySavesHubViewModel — partial fill (isEmpty = false)", () => {
  it("is not empty when only bookmarks are present", () => {
    const vm = buildMySavesHubViewModel({
      ...emptyInputs,
      bookmarks: [makeBookmark(1)],
    });
    expect(vm.isEmpty).toBe(false);
  });

  it("is not empty when only rate alerts are present", () => {
    const vm = buildMySavesHubViewModel({
      ...emptyInputs,
      rateAlerts: [makeAlert(1)],
    });
    expect(vm.isEmpty).toBe(false);
  });

  it("is not empty when only watchlist is present", () => {
    const vm = buildMySavesHubViewModel({
      ...emptyInputs,
      watchlistItems: [makeWatchlistItem(1)],
    });
    expect(vm.isEmpty).toBe(false);
  });

  it("is not empty when only saved searches are present", () => {
    const vm = buildMySavesHubViewModel({
      ...emptyInputs,
      savedSearches: [makeSavedSearch(1)],
    });
    expect(vm.isEmpty).toBe(false);
  });

  it("is not empty when only comparisons are present", () => {
    const vm = buildMySavesHubViewModel({
      ...emptyInputs,
      comparisons: [makeComparison(1)],
    });
    expect(vm.isEmpty).toBe(false);
  });

  it("other sections stay at count=0 when only one section has data", () => {
    const vm = buildMySavesHubViewModel({
      ...emptyInputs,
      watchlistItems: [makeWatchlistItem(1), makeWatchlistItem(2)],
    });
    expect(vm.bookmarks.count).toBe(0);
    expect(vm.comparisons.count).toBe(0);
    expect(vm.savedSearches.count).toBe(0);
    expect(vm.rateAlerts.count).toBe(0);
    expect(vm.watchlist.count).toBe(2);
  });
});

describe("buildMySavesHubViewModel — bookmark shape projection", () => {
  it("projects only the fields needed by the hub view", () => {
    const bm = makeBookmark(1);
    const vm = buildMySavesHubViewModel({ ...emptyInputs, bookmarks: [bm] });
    const projected = vm.bookmarks.recent[0];
    expect(projected).toBeDefined();
    if (!projected) return;
    // Required hub fields
    expect(projected.id).toBe(bm.id);
    expect(projected.bookmark_type).toBe(bm.bookmark_type);
    expect(projected.ref).toBe(bm.ref);
    expect(projected.label).toBe(bm.label);
    expect(projected.created_at).toBe(bm.created_at);
    // user_id is NOT included in the projection — hub doesn't need it
    expect("user_id" in projected).toBe(false);
  });
});

describe("buildMySavesHubViewModel — watchlist / comparison / search / alert passthrough", () => {
  it("passes watchlist items through unchanged", () => {
    const w = makeWatchlistItem(5);
    const vm = buildMySavesHubViewModel({ ...emptyInputs, watchlistItems: [w] });
    expect(vm.watchlist.recent[0]).toEqual(w);
  });

  it("passes comparison items through unchanged", () => {
    const c = makeComparison(3);
    const vm = buildMySavesHubViewModel({ ...emptyInputs, comparisons: [c] });
    expect(vm.comparisons.recent[0]).toEqual(c);
  });

  it("passes saved search items through unchanged", () => {
    const s = makeSavedSearch(2);
    const vm = buildMySavesHubViewModel({ ...emptyInputs, savedSearches: [s] });
    expect(vm.savedSearches.recent[0]).toEqual(s);
  });

  it("passes rate alert items through unchanged", () => {
    const a = makeAlert(4);
    const vm = buildMySavesHubViewModel({ ...emptyInputs, rateAlerts: [a] });
    expect(vm.rateAlerts.recent[0]).toEqual(a);
  });
});
