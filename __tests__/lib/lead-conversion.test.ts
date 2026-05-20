import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { getLeadConversionStats, rollUpBySource } from "@/lib/lead-conversion";

describe("rollUpBySource (pure)", () => {
  it("aggregates verticals into per-source totals + blended rate", () => {
    const rows = [
      { source: "google", vertical: "super", totalLeads: 100, convertedLeads: 20, conversionRate: 0.2 },
      { source: "google", vertical: "shares", totalLeads: 100, convertedLeads: 40, conversionRate: 0.4 },
      { source: "direct", vertical: "super", totalLeads: 50, convertedLeads: 5, conversionRate: 0.1 },
    ];
    const rolled = rollUpBySource(rows);
    const google = rolled.find((r) => r.source === "google")!;
    expect(google.totalLeads).toBe(200);
    expect(google.convertedLeads).toBe(60);
    expect(google.conversionRate).toBeCloseTo(0.3, 5);
    // sorted by total desc → google first
    expect(rolled[0]!.source).toBe("google");
  });

  it("handles empty input", () => {
    expect(rollUpBySource([])).toEqual([]);
  });
});

describe("getLeadConversionStats", () => {
  beforeEach(() => mockFrom.mockReset());

  it("maps view rows with numeric coercion", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          { source: "google", vertical: "super", total_leads: "100", converted_leads: "20", conversion_rate: "0.2000" },
        ],
        error: null,
      }),
    });
    const stats = await getLeadConversionStats();
    expect(stats[0]).toEqual({
      source: "google",
      vertical: "super",
      totalLeads: 100,
      convertedLeads: 20,
      conversionRate: 0.2,
    });
  });

  it("returns [] on error", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
    });
    expect(await getLeadConversionStats()).toEqual([]);
  });
});
