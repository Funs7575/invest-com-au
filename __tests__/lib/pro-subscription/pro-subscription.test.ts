import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  SUBSCRIPTION_CONFIGS,
  getPriorityWeightBps,
  getProSubscription,
  getTierConfig,
  setProSubscriptionTier,
} from "@/lib/pro-subscription";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("subscription tier config", () => {
  it("exposes 4 tiers", () => {
    expect(Object.keys(SUBSCRIPTION_CONFIGS).sort()).toEqual([
      "free",
      "growth",
      "scale",
      "starter",
    ]);
  });

  it("free tier has zero priority weight", () => {
    expect(getPriorityWeightBps("free")).toBe(0);
  });

  it("priority weight strictly increases with tier", () => {
    const order = ["free", "starter", "growth", "scale"] as const;
    let prev = -1;
    for (const tier of order) {
      const cur = getPriorityWeightBps(tier);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });

  it("scale tier doubles the accept cap", () => {
    expect(getTierConfig("scale").acceptCapMultiplier).toBe(2);
    expect(getTierConfig("free").acceptCapMultiplier).toBe(1);
  });

  it("prices are monotonic across tiers", () => {
    expect(getTierConfig("free").monthlyPriceCents).toBe(0);
    expect(getTierConfig("starter").monthlyPriceCents).toBe(2900);
    expect(getTierConfig("growth").monthlyPriceCents).toBe(9900);
    expect(getTierConfig("scale").monthlyPriceCents).toBe(24900);
  });
});

describe("getProSubscription", () => {
  it("returns the tier and status from the row", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              subscription_tier: "growth",
              subscription_status: "active",
              subscription_current_period_end: "2026-06-01T00:00:00Z",
            },
            error: null,
          }),
        }),
      }),
    }));
    const result = await getProSubscription(1);
    expect(result.tier).toBe("growth");
    expect(result.status).toBe("active");
    expect(result.periodEnd).toBe("2026-06-01T00:00:00Z");
  });

  it("defaults to free/inactive when the row has nulls", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { subscription_tier: null }, error: null }),
        }),
      }),
    }));
    const result = await getProSubscription(1);
    expect(result.tier).toBe("free");
    expect(result.status).toBe("inactive");
  });

  it("fails safe on read error (returns free)", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockRejectedValue(new Error("db down")),
        }),
      }),
    }));
    const result = await getProSubscription(1);
    expect(result.tier).toBe("free");
  });
});

describe("setProSubscriptionTier", () => {
  it("writes the tier, status, and period end", async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockFrom.mockImplementation(() => ({ update: updateMock }));
    await setProSubscriptionTier({
      professionalId: 7,
      tier: "growth",
      status: "trialing",
      periodEnd: "2026-06-01T00:00:00Z",
    });
    const call = updateMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.subscription_tier).toBe("growth");
    expect(call.subscription_status).toBe("trialing");
    expect(call.subscription_current_period_end).toBe("2026-06-01T00:00:00Z");
  });

  it("throws when the update fails", async () => {
    mockFrom.mockImplementation(() => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "constraint violation" },
        }),
      }),
    }));
    await expect(
      setProSubscriptionTier({ professionalId: 1, tier: "starter" }),
    ).rejects.toThrow(/constraint violation/);
  });
});
