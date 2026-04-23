import { describe, it, expect, vi } from "vitest";

// Mock the cache + supabase layers so the module loads without
// hitting network. We're only testing the pure helpers exported
// alongside the cached fetchers.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => fn,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    })),
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import {
  computeCategoryStatus,
  daysSinceVerified,
} from "@/lib/fi-data-server";
import type { DbDataCategory } from "@/lib/fi-data-server";

function makeCategory(overrides: Partial<DbDataCategory> = {}): DbDataCategory {
  return {
    id: "c1",
    category_key: "tax",
    display_name: "Tax",
    last_verified_at: new Date().toISOString(),
    verified_by: "admin",
    warning_threshold_days: 60,
    urgent_threshold_days: 90,
    source_url: null,
    source_label: null,
    notes: null,
    sort_order: 0,
    ...overrides,
  } as DbDataCategory;
}

describe("computeCategoryStatus", () => {
  it("returns 'stale' when never verified", () => {
    expect(
      computeCategoryStatus(makeCategory({ last_verified_at: null })),
    ).toBe("stale");
  });

  it("returns 'current' when recently verified (< 75% of warning threshold)", () => {
    // 30 days ago, with warn=60 → 75% = 45. 30 < 45 → current
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      computeCategoryStatus(makeCategory({ last_verified_at: d })),
    ).toBe("current");
  });

  it("returns 'needs_review' between 75% of warn and warn", () => {
    // 50 days ago, warn=60 → 50 >= 45, 50 < 60 → needs_review
    const d = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      computeCategoryStatus(makeCategory({ last_verified_at: d })),
    ).toBe("needs_review");
  });

  it("returns 'stale' between warn and urgent", () => {
    // 70 days ago, warn=60, urgent=90 → stale
    const d = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      computeCategoryStatus(makeCategory({ last_verified_at: d })),
    ).toBe("stale");
  });

  it("returns 'urgent' when past the urgent threshold", () => {
    // 100 days ago, urgent=90 → urgent
    const d = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      computeCategoryStatus(makeCategory({ last_verified_at: d })),
    ).toBe("urgent");
  });

  it("boundary: exactly at urgent threshold is 'urgent'", () => {
    const d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      computeCategoryStatus(
        makeCategory({
          last_verified_at: d,
          warning_threshold_days: 60,
          urgent_threshold_days: 90,
        }),
      ),
    ).toBe("urgent");
  });
});

describe("daysSinceVerified", () => {
  it("returns Infinity when null", () => {
    expect(daysSinceVerified(null)).toBe(Infinity);
  });

  it("returns 0 when verified today", () => {
    expect(daysSinceVerified(new Date().toISOString())).toBe(0);
  });

  it("returns an integer number of days", () => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysSinceVerified(d)).toBe(30);
  });
});
