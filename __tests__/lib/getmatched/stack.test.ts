/**
 * Tests for lib/getmatched/stack — wealth-stack derivation (Showcase G9).
 *
 * `deriveStackInputs` is pure and tested directly. `computeWealthStack` is
 * covered with a mocked admin client to assert it partitions brokers by
 * platform_type, returns one slot per kind, and fails soft to [].
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { adminFrom } = vi.hoisted(() => ({ adminFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: adminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { deriveStackInputs, computeWealthStack } from "@/lib/getmatched/stack";

describe("deriveStackInputs", () => {
  it("maps budget band → amount key", () => {
    expect(deriveStackInputs({ budget_band: "10k_100k" }).amount).toBe("medium");
    expect(deriveStackInputs({ budget_band: "1m_plus" }).amount).toBe("whale");
  });

  it("defaults risk band to balanced when nothing maps", () => {
    expect(deriveStackInputs({}).riskBand).toBe("balanced");
  });

  it("maps conservative / growth risk signals", () => {
    expect(deriveStackInputs({ risk_appetite: "conservative" }).riskBand).toBe("conservative");
    expect(deriveStackInputs({ experience: "pro" }).riskBand).toBe("growth");
  });

  it("defaults horizon to mid", () => {
    expect(deriveStackInputs({}).horizon).toBe("mid");
    expect(deriveStackInputs({ timeline: "asap" }).horizon).toBe("short");
    expect(deriveStackInputs({ timeline: "long_term" }).horizon).toBe("long");
  });

  it("sets interest flags from the stated goal", () => {
    expect(deriveStackInputs({ intent: "super" }).superInterest).toBe(true);
    expect(deriveStackInputs({ intent: "automate" }).roboInterest).toBe(true);
    expect(deriveStackInputs({ intent: "income" }).savingsInterest).toBe(true);
    expect(deriveStackInputs({ intent: "crypto" }).superInterest).toBe(false);
  });
});

describe("computeWealthStack", () => {
  beforeEach(() => vi.clearAllMocks());

  function thenable<T>(result: T) {
    const q: Record<string, unknown> = {};
    q.select = vi.fn(() => q);
    q.eq = vi.fn(() => q);
    q.then = (resolve: (v: unknown) => unknown) => resolve(result);
    return q;
  }

  it("returns one slot per platform_type with supply", async () => {
    const brokers = [
      { slug: "superco", name: "SuperCo", platform_type: "super_fund", rating: 4.5, status: "active", logo_url: null },
      { slug: "roboco", name: "RoboCo", platform_type: "robo_advisor", rating: 4.2, status: "active", logo_url: null },
      { slug: "shareco", name: "ShareCo", platform_type: "share_broker", rating: 4.0, status: "active", logo_url: null },
    ];
    const weights = [
      { broker_slug: "superco", beginner_weight: 1, low_fee_weight: 5, us_shares_weight: 0, smsf_weight: 5, crypto_weight: 0, advanced_weight: 0, property_weight: 0, robo_weight: 5 },
      { broker_slug: "roboco", beginner_weight: 5, low_fee_weight: 3, us_shares_weight: 0, smsf_weight: 0, crypto_weight: 0, advanced_weight: 0, property_weight: 0, robo_weight: 5 },
      { broker_slug: "shareco", beginner_weight: 5, low_fee_weight: 5, us_shares_weight: 0, smsf_weight: 0, crypto_weight: 0, advanced_weight: 0, property_weight: 0, robo_weight: 0 },
    ];
    adminFrom.mockImplementation((table: string) =>
      table === "brokers" ? thenable({ data: brokers, error: null }) : thenable({ data: weights, error: null }),
    );

    const stack = await computeWealthStack({ intent: "grow", budget_band: "10k_100k" });
    const kinds = stack.map((s) => s.kind);
    expect(kinds).toContain("super_fund");
    expect(kinds).toContain("robo_advisor");
    // share_broker is not a stack kind → excluded
    expect(stack.every((s) => s.kind !== "share_broker" as unknown)).toBe(true);
    const superSlot = stack.find((s) => s.kind === "super_fund");
    expect(superSlot?.href).toBe("/super/superco");
  });

  it("returns [] when there are no stack-kind brokers", async () => {
    const brokers = [
      { slug: "shareco", name: "ShareCo", platform_type: "share_broker", rating: 4.0, status: "active", logo_url: null },
    ];
    const weights = [
      { broker_slug: "shareco", beginner_weight: 5, low_fee_weight: 5, us_shares_weight: 0, smsf_weight: 0, crypto_weight: 0, advanced_weight: 0, property_weight: 0, robo_weight: 0 },
    ];
    adminFrom.mockImplementation((table: string) =>
      table === "brokers" ? thenable({ data: brokers, error: null }) : thenable({ data: weights, error: null }),
    );
    expect(await computeWealthStack({ intent: "grow" })).toEqual([]);
  });

  it("fails soft to [] on a DB error", async () => {
    adminFrom.mockImplementation(() => thenable({ data: null, error: { message: "boom" } }));
    expect(await computeWealthStack({})).toEqual([]);
  });
});
