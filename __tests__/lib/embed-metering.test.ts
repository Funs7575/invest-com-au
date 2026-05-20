import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { hashApiKey, isPeriodStale, verifyAndMeter } from "@/lib/embed-metering";

describe("hashApiKey", () => {
  it("is deterministic sha256 hex", () => {
    expect(hashApiKey("ik_abc")).toBe(hashApiKey("ik_abc"));
    expect(hashApiKey("ik_abc")).toHaveLength(64);
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
  });
});

describe("isPeriodStale (pure)", () => {
  const may = Date.parse("2026-05-20T00:00:00Z");
  it("stale when null", () => {
    expect(isPeriodStale(null, may)).toBe(true);
  });
  it("fresh within the same month", () => {
    expect(isPeriodStale("2026-05-01T00:00:00Z", may)).toBe(false);
  });
  it("stale across a month boundary", () => {
    expect(isPeriodStale("2026-04-30T00:00:00Z", may)).toBe(true);
  });
});

describe("verifyAndMeter", () => {
  // Pin the clock to May 2026 so usage_period_start "2026-05-01" is NOT
  // treated as stale (verifyAndMeter rolls the counter over at month
  // boundaries via the real clock).
  beforeEach(() => {
    mockFrom.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  function customerLookup(data: unknown) {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) }),
        }),
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    };
  }

  it("rejects an unknown key", async () => {
    mockFrom.mockReturnValue(customerLookup(null));
    expect(await verifyAndMeter({ apiKey: "ik_x", endpoint: "/w" })).toEqual({
      ok: false,
      reason: "invalid_key",
    });
  });

  it("rejects an inactive customer", async () => {
    mockFrom.mockReturnValue(
      customerLookup({ id: 1, status: "suspended", monthly_quota_requests: 100, usage_this_period: 0, usage_period_start: "2026-05-01T00:00:00Z" }),
    );
    expect((await verifyAndMeter({ apiKey: "ik_x", endpoint: "/w" })).ok).toBe(false);
  });

  it("rejects when over quota", async () => {
    mockFrom.mockImplementation(() =>
      customerLookup({ id: 1, status: "active", monthly_quota_requests: 10, usage_this_period: 10, usage_period_start: "2026-05-01T00:00:00Z" }),
    );
    const res = await verifyAndMeter({ apiKey: "ik_x", endpoint: "/w" });
    expect(res).toEqual({ ok: false, reason: "over_quota" });
  });

  it("meters a within-quota request", async () => {
    const lookup = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 1, status: "active", monthly_quota_requests: 100, usage_this_period: 5, usage_period_start: "2026-05-01T00:00:00Z" },
              error: null,
            }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValue(lookup);
    const res = await verifyAndMeter({ apiKey: "ik_x", endpoint: "/w" });
    expect(res).toEqual({ ok: true, customerId: 1, usageThisPeriod: 6, quota: 100 });
  });
});
