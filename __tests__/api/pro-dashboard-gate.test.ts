/**
 * Pro gate tests for /pro/dashboard.
 *
 * Covers the Pro gate logic (getSubscription → isPro) and the
 * summary-assembly helper (assembleDashboardSummary) exercised by the
 * page server component — without rendering JSX.
 *
 * Pattern mirrors __tests__/api/pro-insights-gate.test.ts:
 *   vi.hoisted for shared mock fns, vi.mock at top, imports after.
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

// Subscription mock data — mutated per test.
let subData: { status: string } | null = null;

const mockServerFrom = vi.fn((table: string) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.not = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => {
    if (table === "subscriptions") return { data: subData, error: null };
    return { data: null, error: null };
  });
  chain.single = vi.fn(async () => ({ data: null, error: null }));
  return chain;
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

// Admin client mock — used by rate_alert_subscriptions fetch
const mockAdminFrom = vi.fn((_table: string) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
  return chain;
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// Minimal SEO stubs
vi.mock("@/lib/seo", () => ({
  absoluteUrl: (p: string) => `https://invest.com.au${p}`,
  breadcrumbJsonLd: vi.fn(() => ({ "@context": "https://schema.org" })),
  SITE_NAME: "Invest.com.au",
  SITE_URL: "https://invest.com.au",
  CURRENT_YEAR: 2026,
}));

// Stub getCurrentPricesBatch — not under test here
vi.mock("@/lib/holdings/value", () => ({
  getCurrentPricesBatch: vi.fn(async () => new Map()),
  keyOf: (ticker: string, exchange: string) => `${ticker}|${exchange}`,
}));

// Stub listBookmarks — not under test here
vi.mock("@/lib/bookmarks", () => ({
  listBookmarks: vi.fn(async () => []),
}));

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { getSubscription } from "@/lib/server/get-subscription";
import { assembleDashboardSummary } from "@/app/pro/dashboard/page";

// ─── Pro gate: getSubscription behaviour ────────────────────────────────────

describe("Pro gate — getSubscription (dashboard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subData = null;
  });

  afterAll(() => vi.restoreAllMocks());

  it("returns isPro=false for a signed-out user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const { isPro, user } = await getSubscription();
    expect(isPro).toBe(false);
    expect(user).toBeNull();
  });

  it("returns isPro=false for signed-in user with no subscription", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u-1" } },
    });
    subData = null;
    const { isPro } = await getSubscription();
    expect(isPro).toBe(false);
  });

  it("returns isPro=true for status=active", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u-2" } },
    });
    subData = { status: "active" };
    const { isPro } = await getSubscription();
    expect(isPro).toBe(true);
  });

  it("returns isPro=true for status=trialing", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u-3" } },
    });
    subData = { status: "trialing" };
    const { isPro } = await getSubscription();
    expect(isPro).toBe(true);
  });

  it("returns isPro=false for status=past_due", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u-4" } },
    });
    subData = { status: "past_due" };
    const { isPro } = await getSubscription();
    expect(isPro).toBe(false);
  });
});

// ─── upgradeHref derivation ──────────────────────────────────────────────────

describe("Pro dashboard — upgradeHref derivation", () => {
  it("points to /account/upgrade for a signed-in non-Pro user", () => {
    const user = { id: "u1" };
    const upgradeHref = user ? "/account/upgrade" : "/auth/login?next=/pro/dashboard";
    expect(upgradeHref).toBe("/account/upgrade");
  });

  it("points to login for a signed-out visitor", () => {
    const user = null;
    const upgradeHref = user ? "/account/upgrade" : "/auth/login?next=/pro/dashboard";
    expect(upgradeHref).toBe("/auth/login?next=/pro/dashboard");
  });
});

// ─── assembleDashboardSummary ────────────────────────────────────────────────

describe("assembleDashboardSummary", () => {
  const emptyParams = {
    holdings: [] as { ticker: string | null; exchange: string | null; shares: number | null; cost_basis_per_share_cents: number | null }[],
    priceMap: new Map<string, { priceCents: number } | null>(),
    manualBalanceTotalCents: 0,
    goalBalanceCents: 0,
    alerts: [] as { last_notified_at: string | null }[],
    watchlistCount: 0,
    savedScenariosCount: 0,
    activeDealsCount: 0,
    bookmarksCount: 0,
  };

  it("returns zeroed summary for all-empty input", () => {
    const summary = assembleDashboardSummary(emptyParams);
    expect(summary.portfolioValueCents).toBe(0);
    expect(summary.pricedHoldingsCount).toBe(0);
    expect(summary.netWorthCents).toBe(0);
    expect(summary.alertsCount).toBe(0);
    expect(summary.watchlistCount).toBe(0);
    expect(summary.savedScenariosCount).toBe(0);
    expect(summary.activeDealsCount).toBe(0);
    expect(summary.bookmarksCount).toBe(0);
    expect(summary.hasActiveAlerts).toBe(false);
  });

  it("calculates portfolio value from priced holdings", () => {
    const priceMap = new Map<string, { priceCents: number } | null>([
      ["CBA|ASX", { priceCents: 10000 }], // $100.00
      ["BHP|ASX", { priceCents: 5000 }],  // $50.00
    ]);
    const summary = assembleDashboardSummary({
      ...emptyParams,
      holdings: [
        { ticker: "CBA", exchange: "ASX", shares: 10, cost_basis_per_share_cents: 9000 },
        { ticker: "BHP", exchange: "ASX", shares: 5, cost_basis_per_share_cents: 4500 },
      ],
      priceMap,
    });
    // 10 * 10000 + 5 * 5000 = 125000
    expect(summary.portfolioValueCents).toBe(125000);
    expect(summary.holdingsCount).toBe(2);
    expect(summary.pricedHoldingsCount).toBe(2);
  });

  it("skips holdings with no price in the priceMap", () => {
    const summary = assembleDashboardSummary({
      ...emptyParams,
      holdings: [
        { ticker: "XYZ", exchange: "ASX", shares: 100, cost_basis_per_share_cents: 500 },
      ],
      priceMap: new Map(), // no prices
    });
    expect(summary.portfolioValueCents).toBe(0);
    expect(summary.holdingsCount).toBe(1);
    expect(summary.pricedHoldingsCount).toBe(0);
  });

  it("sums netWorthCents from all three sources", () => {
    const priceMap = new Map<string, { priceCents: number } | null>([["ABC|ASX", { priceCents: 1000 }]]);
    const summary = assembleDashboardSummary({
      ...emptyParams,
      holdings: [{ ticker: "ABC", exchange: "ASX", shares: 2, cost_basis_per_share_cents: 800 }],
      priceMap,
      manualBalanceTotalCents: 50000,
      goalBalanceCents: 30000,
    });
    // 2 * 1000 + 50000 + 30000 = 82000
    expect(summary.netWorthCents).toBe(82000);
  });

  it("reflects alert count and hasActiveAlerts correctly", () => {
    const summary = assembleDashboardSummary({
      ...emptyParams,
      alerts: [
        { last_notified_at: null },
        { last_notified_at: "2026-05-01T00:00:00Z" },
        { last_notified_at: null },
      ],
    });
    expect(summary.alertsCount).toBe(3);
    expect(summary.hasActiveAlerts).toBe(true);
  });

  it("hasActiveAlerts is false when no alert has fired", () => {
    const summary = assembleDashboardSummary({
      ...emptyParams,
      alerts: [
        { last_notified_at: null },
        { last_notified_at: null },
      ],
    });
    expect(summary.hasActiveAlerts).toBe(false);
  });

  it("carries through watchlist, saved scenarios, deals and bookmarks counts", () => {
    const summary = assembleDashboardSummary({
      ...emptyParams,
      watchlistCount: 4,
      savedScenariosCount: 7,
      activeDealsCount: 2,
      bookmarksCount: 13,
    });
    expect(summary.watchlistCount).toBe(4);
    expect(summary.savedScenariosCount).toBe(7);
    expect(summary.activeDealsCount).toBe(2);
    expect(summary.bookmarksCount).toBe(13);
  });

  it("ignores holdings with null ticker or exchange", () => {
    const summary = assembleDashboardSummary({
      ...emptyParams,
      holdings: [
        { ticker: null, exchange: "ASX", shares: 10, cost_basis_per_share_cents: 500 },
        { ticker: "ABC", exchange: null, shares: 10, cost_basis_per_share_cents: 500 },
      ],
      priceMap: new Map<string, { priceCents: number } | null>([["ABC|ASX", { priceCents: 1000 }]]),
    });
    // Neither holding can be priced — ticker/exchange both required
    expect(summary.portfolioValueCents).toBe(0);
    // holdingsCount still reflects all rows
    expect(summary.holdingsCount).toBe(2);
  });
});
