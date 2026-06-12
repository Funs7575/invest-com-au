import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

const { dbQueue, fromCalls, selectCalls } = vi.hoisted(() => ({
  dbQueue: [] as DbResult[],
  fromCalls: [] as string[],
  selectCalls: [] as unknown[][],
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      fromCalls.push(table);
      const res = dbQueue.shift() ?? { data: [], error: null };
      const chain: Record<string, unknown> = {};
      for (const m of ["eq", "gt", "gte", "in", "or", "order", "limit", "not", "neq", "like"]) {
        chain[m] = vi.fn(() => chain);
      }
      chain.select = vi.fn((...args: unknown[]) => {
        selectCalls.push(args);
        return chain;
      });
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }));
      return chain;
    }),
  })),
}));

import {
  aggregateDemand,
  medianBudgetBand,
  bandMidpointAud,
  budgetBandLabel,
  advisorTypeLabel,
  getDemandBoardData,
  fetchOpenDemandRows,
  countOpenDemand,
  emptyDemandBoardData,
  MIN_BAND_SAMPLE,
  DEMAND_ALERT_EXTERNAL_PREFIX,
  type DemandSourceRow,
} from "@/lib/demand-board";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date("2026-06-12T10:00:00.000Z");

function row(overrides: Partial<DemandSourceRow> = {}): DemandSourceRow {
  return {
    advisor_types: ["smsf_accountant"],
    location: "NSW",
    budget_band: "2k_5k",
    created_at: "2026-06-12T08:00:00.000Z", // 2h before NOW
    flow_type: "auction",
    ...overrides,
  };
}

beforeEach(() => {
  dbQueue.length = 0;
  fromCalls.length = 0;
  selectCalls.length = 0;
});

// ── Pure helpers ─────────────────────────────────────────────────────────────

describe("medianBudgetBand", () => {
  it("returns null below the suppression threshold", () => {
    expect(medianBudgetBand([])).toBeNull();
    expect(medianBudgetBand(["2k_5k", "2k_5k"])).toBeNull();
    expect(MIN_BAND_SAMPLE).toBe(3);
  });

  it("ignores not_sure / null / unknown values", () => {
    expect(medianBudgetBand(["2k_5k", "not_sure", null, "weird_band", "2k_5k"])).toBeNull();
    expect(medianBudgetBand(["2k_5k", "2k_5k", "2k_5k", "not_sure"])).toBe("2k_5k");
  });

  it("takes the lower-middle band for even-length samples", () => {
    expect(medianBudgetBand(["under_500", "500_2k", "2k_5k", "10k_plus"])).toBe("500_2k");
  });

  it("computes the middle band for odd-length samples regardless of order", () => {
    expect(medianBudgetBand(["10k_plus", "under_500", "2k_5k"])).toBe("2k_5k");
  });
});

describe("band + label helpers", () => {
  it("maps bands to conservative midpoints and not_sure/unknown to null", () => {
    expect(bandMidpointAud("under_500")).toBe(350);
    expect(bandMidpointAud("10k_plus")).toBe(12000);
    expect(bandMidpointAud("not_sure")).toBeNull();
    expect(bandMidpointAud("nonsense")).toBeNull();
    expect(bandMidpointAud(null)).toBeNull();
  });

  it("labels bands with a safe fallback", () => {
    expect(budgetBandLabel("2k_5k")).toBe("$2,000–$5,000");
    expect(budgetBandLabel("unknown_thing")).toBe("Budget not stated");
  });

  it("labels advisor types from the canonical map with a title-case fallback", () => {
    expect(advisorTypeLabel("smsf_accountant")).toBe("SMSF Accountant");
    expect(advisorTypeLabel("space_lawyer")).toBe("Space Lawyer");
  });

  it("exposes the prospects external_id prefix used by capture + cron + unsubscribe", () => {
    expect(DEMAND_ALERT_EXTERNAL_PREFIX).toBe("demand-alert:");
  });
});

// ── aggregateDemand ──────────────────────────────────────────────────────────

describe("aggregateDemand", () => {
  it("returns an all-empty snapshot for zero rows", () => {
    const snap = aggregateDemand([], NOW);
    expect(snap.totalOpen).toBe(0);
    expect(snap.byState).toEqual([]);
    expect(snap.byType).toEqual([]);
    expect(snap.cells).toEqual([]);
    expect(snap.bandMix).toBeNull();
    expect(snap.medianOpenBand).toBeNull();
    expect(snap.estFeePoolAud).toBe(0);
  });

  it("counts briefs once in totals but once per advisor type in type buckets", () => {
    const snap = aggregateDemand(
      [
        row({ advisor_types: ["smsf_accountant", "financial_planner"] }),
        row({ advisor_types: ["financial_planner"], location: "VIC" }),
      ],
      NOW,
    );
    expect(snap.totalOpen).toBe(2);
    const planner = snap.byType.find((t) => t.type === "financial_planner");
    const smsf = snap.byType.find((t) => t.type === "smsf_accountant");
    expect(planner?.count).toBe(2);
    expect(smsf?.count).toBe(1);
    // Sparse state × type cells
    expect(snap.cells).toContainEqual({ state: "NSW", type: "smsf_accountant", label: "SMSF Accountant", count: 1 });
    expect(snap.cells).toContainEqual({ state: "VIC", type: "financial_planner", label: "Financial Planner", count: 1 });
  });

  it("tracks recency buckets from created_at", () => {
    const snap = aggregateDemand(
      [
        row({ created_at: "2026-06-12T08:00:00.000Z" }), // 2h ago → today + week
        row({ created_at: "2026-06-08T10:00:00.000Z" }), // 4d ago → week only
        row({ created_at: "2026-05-01T10:00:00.000Z" }), // old
      ],
      NOW,
    );
    expect(snap.postedToday).toBe(1);
    expect(snap.postedThisWeek).toBe(2);
    const nsw = snap.byState.find((s) => s.state === "NSW");
    expect(nsw?.count).toBe(3);
    expect(nsw?.postedThisWeek).toBe(2);
    expect(nsw?.newestAgeHours).toBe(2);
  });

  it("sums conservative band midpoints into the fee pool, skipping not_sure", () => {
    const snap = aggregateDemand(
      [row({ budget_band: "2k_5k" }), row({ budget_band: "10k_plus" }), row({ budget_band: "not_sure" }), row({ budget_band: null })],
      NOW,
    );
    expect(snap.estFeePoolAud).toBe(3500 + 12000);
  });

  it("suppresses the band mix and medians below MIN_BAND_SAMPLE", () => {
    const two = aggregateDemand([row({ budget_band: "2k_5k" }), row({ budget_band: "5k_10k" })], NOW);
    expect(two.bandMix).toBeNull();
    expect(two.medianOpenBand).toBeNull();
    expect(two.byType[0]?.medianBand).toBeNull();

    const three = aggregateDemand(
      [row({ budget_band: "2k_5k" }), row({ budget_band: "2k_5k" }), row({ budget_band: "5k_10k" })],
      NOW,
    );
    expect(three.bandMix).toEqual([
      { band: "2k_5k", label: "$2,000–$5,000", count: 2 },
      { band: "5k_10k", label: "$5,000–$10,000", count: 1 },
    ]);
    expect(three.medianOpenBand).toBe("2k_5k");
    expect(three.byType[0]?.medianBand).toBe("2k_5k");
    expect(three.byType[0]?.medianBandLabel).toBe("$2,000–$5,000");
  });

  it("routes unknown locations to unspecifiedLocation instead of inventing states", () => {
    const snap = aggregateDemand([row({ location: "Sydneyish" }), row({ location: null }), row({})], NOW);
    expect(snap.totalOpen).toBe(3);
    expect(snap.unspecifiedLocation).toBe(2);
    expect(snap.byState).toHaveLength(1);
    expect(snap.byState[0]?.state).toBe("NSW");
  });

  it("orders byState and byType by count descending", () => {
    const snap = aggregateDemand(
      [row({ location: "VIC" }), row({ location: "VIC" }), row({ location: "QLD" }), row({ advisor_types: ["tax_agent"], location: "VIC" })],
      NOW,
    );
    expect(snap.byState[0]?.state).toBe("VIC");
    expect(snap.byState[0]?.count).toBe(3);
    expect(snap.byType[0]?.type).toBe("smsf_accountant");
  });
});

// ── Data access ──────────────────────────────────────────────────────────────

describe("fetchOpenDemandRows", () => {
  it("selects ONLY the five anonymous columns (privacy regression guard)", async () => {
    dbQueue.push({ data: [row()] });
    const rows = await fetchOpenDemandRows();
    expect(rows).toHaveLength(1);
    expect(fromCalls).toEqual(["advisor_auctions"]);
    expect(selectCalls[0]?.[0]).toBe("advisor_types, location, budget_band, created_at, flow_type");
  });

  it("returns [] on query error", async () => {
    dbQueue.push({ data: null, error: { message: "boom" } });
    await expect(fetchOpenDemandRows()).resolves.toEqual([]);
  });
});

describe("getDemandBoardData", () => {
  it("aggregates open rows and the accepted sample", async () => {
    dbQueue.push({ data: [row(), row({ location: "VIC" })] }); // open rows
    dbQueue.push({ data: [{ budget_band: "5k_10k" }, { budget_band: "5k_10k" }, { budget_band: "2k_5k" }] }); // accepted
    const data = await getDemandBoardData();
    expect(data.snapshot.totalOpen).toBe(2);
    expect(data.accepted.count).toBe(3);
    expect(data.accepted.medianBand).toBe("5k_10k");
    expect(typeof data.generatedAt).toBe("string");
  });

  it("suppresses the accepted median below MIN_BAND_SAMPLE", async () => {
    dbQueue.push({ data: [] });
    dbQueue.push({ data: [{ budget_band: "5k_10k" }, { budget_band: "5k_10k" }] });
    const data = await getDemandBoardData();
    expect(data.accepted.count).toBe(2);
    expect(data.accepted.medianBand).toBeNull();
  });

  it("degrades to an empty board when queries error", async () => {
    dbQueue.push({ data: null, error: { message: "open failed" } });
    dbQueue.push({ data: null, error: { message: "accepted failed" } });
    const data = await getDemandBoardData();
    expect(data.snapshot.totalOpen).toBe(0);
    expect(data.accepted).toEqual({ count: 0, medianBand: null });
  });

  it("emptyDemandBoardData mirrors the degraded shape", () => {
    const empty = emptyDemandBoardData(NOW);
    expect(empty.snapshot.totalOpen).toBe(0);
    expect(empty.accepted.medianBand).toBeNull();
    expect(empty.generatedAt).toBe(NOW.toISOString());
  });
});

describe("countOpenDemand", () => {
  it("returns the head count", async () => {
    dbQueue.push({ count: 23 });
    await expect(countOpenDemand()).resolves.toBe(23);
  });

  it("returns 0 on error", async () => {
    dbQueue.push({ count: null, error: { message: "nope" } });
    await expect(countOpenDemand()).resolves.toBe(0);
  });
});
