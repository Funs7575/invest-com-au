import { describe, it, expect, vi } from "vitest";

// Pure-function tests only — mock the server client so importing the
// module never touches next/headers.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import {
  bpsToPercent,
  filterChangesWithinDays,
  RATE_PRODUCT_LABELS,
  type RateChangeRow,
} from "@/lib/rate-changes";

function row(partial: Partial<RateChangeRow>): RateChangeRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    broker_slug: "alpha-bank",
    broker_name: "Alpha Bank",
    product_kind: "savings_account",
    old_rate_bps: 500,
    new_rate_bps: 510,
    delta_bps: 10,
    direction: "up",
    snapshot_captured_at: "2026-06-09T01:00:00.000Z",
    logged_at: "2026-06-09T02:00:00.000Z",
    ...partial,
  };
}

describe("bpsToPercent", () => {
  it("converts basis points to a 2dp percentage string", () => {
    expect(bpsToPercent(510)).toBe("5.10%");
    expect(bpsToPercent(5)).toBe("0.05%");
    expect(bpsToPercent(0)).toBe("0.00%");
    expect(bpsToPercent(-25)).toBe("-0.25%");
  });
});

describe("filterChangesWithinDays", () => {
  const now = new Date("2026-06-11T00:00:00.000Z");

  it("keeps rows logged within the window and drops older ones", () => {
    const rows = [
      row({ id: "a", logged_at: "2026-06-10T12:00:00.000Z" }), // 0.5 days ago
      row({ id: "b", logged_at: "2026-06-04T00:00:00.000Z" }), // exactly 7 days ago — kept (inclusive)
      row({ id: "c", logged_at: "2026-06-03T23:59:59.000Z" }), // just outside
    ];
    const recent = filterChangesWithinDays(rows, 7, now);
    expect(recent.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("returns [] when nothing is recent", () => {
    const rows = [row({ logged_at: "2026-01-01T00:00:00.000Z" })];
    expect(filterChangesWithinDays(rows, 7, now)).toEqual([]);
  });
});

describe("RATE_PRODUCT_LABELS", () => {
  it("labels the product kinds the rate log writes", () => {
    expect(RATE_PRODUCT_LABELS.savings_account).toBe("Savings Account");
    expect(RATE_PRODUCT_LABELS.term_deposit).toBe("Term Deposit");
  });
});
