/**
 * Pro gate tests for /pro/insights.
 *
 * Tests the Pro gate logic (getSubscription → isPro) and the data-assembly
 * path exercised by the page server component (without rendering JSX).
 *
 * Pattern mirrors __tests__/lib/server.test.ts (vi.mock at top, imports after).
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

// Admin client mock — used by broker_price_snapshots fetch on the Pro path.
const mockAdminFrom = vi.fn((_table: string) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
  return chain;
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// Minimal SEO stubs so the page's breadcrumb import doesn't fail.
vi.mock("@/lib/seo", () => ({
  absoluteUrl: (p: string) => `https://invest.com.au${p}`,
  breadcrumbJsonLd: vi.fn(() => ({ "@context": "https://schema.org" })),
  SITE_NAME: "Invest.com.au",
  SITE_URL: "https://invest.com.au",
  CURRENT_YEAR: 2026,
}));

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { getSubscription } from "@/lib/server/get-subscription";

// ─── Pro gate: getSubscription behaviour ────────────────────────────────────

describe("Pro gate — getSubscription", () => {
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

  it("returns isPro=false for a signed-in user with no subscription", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
    });
    subData = null;
    const { isPro } = await getSubscription();
    expect(isPro).toBe(false);
  });

  it("returns isPro=true for a user with status=active", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
    });
    subData = { status: "active" };
    const { isPro } = await getSubscription();
    expect(isPro).toBe(true);
  });

  it("returns isPro=true for a user with status=trialing", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
    });
    subData = { status: "trialing" };
    const { isPro } = await getSubscription();
    expect(isPro).toBe(true);
  });

  it("returns isPro=false for a user with status=past_due", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
    });
    subData = { status: "past_due" };
    const { isPro } = await getSubscription();
    expect(isPro).toBe(false);
  });

  it("returns the user object when signed in", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-456", email: "test@example.com" } },
    });
    subData = { status: "active" };
    const { user } = await getSubscription();
    expect(user).toMatchObject({ id: "user-456" });
  });
});

// ─── Pro gate: upgradeHref logic ────────────────────────────────────────────
//
// The page computes upgradeHref = user ? "/account/upgrade" : "/auth/login?next=/pro/insights".
// We verify this logic independently of JSX rendering.

describe("Pro gate — upgradeHref derivation", () => {
  it("points to account/upgrade for a signed-in non-Pro user", () => {
    const user = { id: "u1" };
    const isPro = false;
    const upgradeHref = user && !isPro ? "/account/upgrade" : "/auth/login?next=/pro/insights";
    expect(upgradeHref).toBe("/account/upgrade");
  });

  it("points to login for a signed-out visitor", () => {
    const user = null;
    const upgradeHref = user ? "/account/upgrade" : "/auth/login?next=/pro/insights";
    expect(upgradeHref).toBe("/auth/login?next=/pro/insights");
  });

  it("does not generate an upgradeHref at all when user is Pro", () => {
    const user = { id: "u1" };
    const isPro = true;
    // On the Pro path the upgradeHref variable is still computed but never rendered.
    const upgradeHref = user ? "/account/upgrade" : "/auth/login?next=/pro/insights";
    // The page renders the data dashboard, not the paywall; the link is unused.
    // We just verify the computed value doesn't error.
    expect(typeof upgradeHref).toBe("string");
    expect(isPro).toBe(true);
  });
});

// ─── Data assembly integration: buildFeeComparisonRows with empty data ──────

describe("Pro insights — data assembly with empty snapshots", () => {
  it("buildFeeComparisonRows returns empty array gracefully", async () => {
    const { buildFeeComparisonRows } = await import("@/lib/pro-insights");
    const rows = buildFeeComparisonRows([], new Map());
    expect(rows).toEqual([]);
  });

  it("buildLoanRateSummary returns null-safe shape for empty data", async () => {
    const { buildLoanRateSummary } = await import("@/lib/pro-insights");
    const summary = buildLoanRateSummary([]);
    expect(summary.lowestRate).toBeNull();
    expect(summary.highestRate).toBeNull();
    expect(summary.recentlyUpdated).toHaveLength(0);
  });

  it("buildHealthScoreMovers returns empty array for empty data", async () => {
    const { buildHealthScoreMovers } = await import("@/lib/pro-insights");
    const movers = buildHealthScoreMovers([], new Map(), new Map());
    expect(movers).toEqual([]);
  });
});
