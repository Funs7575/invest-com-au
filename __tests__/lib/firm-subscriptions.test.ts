import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import {
  getFirmSubscription,
  getFirmSeatAvailability,
  canAddSeat,
} from "@/lib/firm-subscriptions";

describe("canAddSeat (pure)", () => {
  it("true only with an active sub and spare seats", () => {
    expect(canAddSeat({ seats: 10, used: 4, available: 6, hasActiveSubscription: true })).toBe(true);
  });
  it("false when seats exhausted", () => {
    expect(canAddSeat({ seats: 5, used: 5, available: 0, hasActiveSubscription: true })).toBe(false);
  });
  it("false without an active subscription", () => {
    expect(canAddSeat({ seats: 10, used: 0, available: 10, hasActiveSubscription: false })).toBe(false);
  });
});

describe("getFirmSubscription", () => {
  beforeEach(() => mockFrom.mockReset());
  it("maps the row", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              firm_id: 3,
              pricing_tier_id: 2,
              seats: 10,
              status: "active",
              current_period_end: "2026-06-01T00:00:00Z",
            },
            error: null,
          }),
        }),
      }),
    });
    const sub = await getFirmSubscription(3);
    expect(sub).toEqual({
      firmId: 3,
      pricingTierId: 2,
      seats: 10,
      status: "active",
      currentPeriodEnd: "2026-06-01T00:00:00Z",
    });
  });
  it("null when absent", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      }),
    });
    expect(await getFirmSubscription(3)).toBeNull();
  });
});

describe("getFirmSeatAvailability", () => {
  beforeEach(() => mockFrom.mockReset());
  it("computes available = seats - used", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "firm_subscriptions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { firm_id: 1, pricing_tier_id: null, seats: 8, status: "active", current_period_end: null },
                error: null,
              }),
            }),
          }),
        };
      }
      // professionals count
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
          }),
        }),
      };
    });
    const avail = await getFirmSeatAvailability(1);
    expect(avail).toEqual({ seats: 8, used: 3, available: 5, hasActiveSubscription: true });
    expect(canAddSeat(avail)).toBe(true);
  });
});
