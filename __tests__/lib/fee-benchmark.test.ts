import { describe, it, expect, vi, beforeEach } from "vitest";

// Bypass the Next.js unstable_cache wrapper so functions run directly.
vi.mock("@/lib/cache", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cache")>("@/lib/cache");
  return { ...actual, cached: (fn: unknown) => fn };
});

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// ── Supabase admin stub — per-table data, chainable builder ──────────────────

const tableData: Record<string, { data: unknown; error: { message: string } | null }> = {};

function makeChain(table: string) {
  const result = () =>
    tableData[table] ?? { data: [], error: null };
  const chain: Record<string, unknown> = {
    then: (
      res: (v: { data: unknown; error: unknown }) => unknown,
      rej?: (e: unknown) => unknown,
    ) => Promise.resolve(result()).then(res, rej),
  };
  for (const m of ["select", "eq", "neq", "in", "gte", "lte", "not", "order", "limit", "range"]) {
    chain[m] = () => chain;
  }
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: (table: string) => makeChain(table) })),
}));

import {
  FEE_BENCHMARK_MIN_SAMPLE,
  FEE_BENCHMARK_WINDOW_DAYS,
  quantileSorted,
  midrankPercentile,
  buildCell,
  percentileForAmount,
  roundedDisplayPercentile,
  ordinal,
  formatCentsAUD,
  labelForQuoteType,
  labelForBudgetBand,
  buildFeeBenchmark,
  benchmarkCellFor,
  percentileInfoForBid,
  computePricingPosition,
  getFeeBenchmark,
  getAdvisorPricingPosition,
  type BidObservation,
} from "@/lib/fee-benchmark";

// ── Fixtures ──────────────────────────────────────────────────────────────────

let nextId = 0;
function ob(
  amountCents: number,
  overrides: Partial<BidObservation> = {},
): BidObservation {
  nextId++;
  return {
    amountCents,
    type: "smsf_accountant",
    state: "NSW",
    advisorId: 1000 + nextId,
    createdAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

/** n distinct observations, amounts base, base+step, … */
function series(
  n: number,
  base: number,
  step: number,
  overrides: Partial<BidObservation> = {},
): BidObservation[] {
  return Array.from({ length: n }, (_, i) => ob(base + i * step, overrides));
}

// ── Pure math ─────────────────────────────────────────────────────────────────

describe("quantileSorted", () => {
  it("returns NaN for an empty array", () => {
    expect(Number.isNaN(quantileSorted([], 0.5))).toBe(true);
  });

  it("returns the single element for any p", () => {
    expect(quantileSorted([42], 0)).toBe(42);
    expect(quantileSorted([42], 0.5)).toBe(42);
    expect(quantileSorted([42], 1)).toBe(42);
  });

  it("interpolates the median of an even-length array", () => {
    expect(quantileSorted([10, 20, 30, 40], 0.5)).toBe(25);
  });

  it("picks the middle element of an odd-length array", () => {
    expect(quantileSorted([10, 20, 30], 0.5)).toBe(20);
  });

  it("returns min at p=0 and max at p=1", () => {
    expect(quantileSorted([5, 7, 11], 0)).toBe(5);
    expect(quantileSorted([5, 7, 11], 1)).toBe(11);
  });

  it("clamps out-of-range p", () => {
    expect(quantileSorted([5, 7, 11], -0.5)).toBe(5);
    expect(quantileSorted([5, 7, 11], 1.5)).toBe(11);
  });

  it("interpolates p25/p75 linearly", () => {
    // [10, 20, 30, 40]: p25 → idx 0.75 → 17.5; p75 → idx 2.25 → 32.5
    expect(quantileSorted([10, 20, 30, 40], 0.25)).toBe(17.5);
    expect(quantileSorted([10, 20, 30, 40], 0.75)).toBe(32.5);
  });
});

describe("midrankPercentile", () => {
  it("returns NaN for an empty array", () => {
    expect(Number.isNaN(midrankPercentile([], 5))).toBe(true);
  });

  it("returns 0 below all values and 100 above all", () => {
    expect(midrankPercentile([1, 2, 3], 0)).toBe(0);
    expect(midrankPercentile([1, 2, 3], 4)).toBe(100);
  });

  it("splits ties at the midrank", () => {
    // [10, 10, 20]: below=0, equal=2 → (0 + 1) / 3 = 33.33…
    expect(midrankPercentile([10, 10, 20], 10)).toBeCloseTo(33.33, 1);
  });

  it("counts strictly-below values", () => {
    expect(midrankPercentile([1, 2, 3, 4], 3.5)).toBe(75);
  });
});

describe("buildCell", () => {
  const dates = (n: number) =>
    Array.from({ length: n }, (_, i) => `2026-0${(i % 5) + 1}-15T00:00:00.000Z`);

  it("suppresses cells below the minimum sample", () => {
    const amounts = [100, 200, 300, 400, 500, 600, 700]; // 7 < 8
    expect(buildCell(amounts, dates(7))).toBeNull();
  });

  it("builds a cell at exactly the minimum sample", () => {
    const amounts = [100, 200, 300, 400, 500, 600, 700, 800];
    const cell = buildCell(amounts, dates(8));
    expect(cell).not.toBeNull();
    expect(cell?.count).toBe(FEE_BENCHMARK_MIN_SAMPLE);
  });

  it("ignores zero, negative and non-finite amounts (and suppresses if too few remain)", () => {
    const amounts = [100, 200, 300, 400, 500, 600, 700, 0, -50, Number.NaN];
    expect(buildCell(amounts, dates(10))).toBeNull(); // only 7 valid
  });

  it("computes median and IQR", () => {
    const amounts = [100, 200, 300, 400, 500, 600, 700, 800];
    const cell = buildCell(amounts, dates(8));
    expect(cell?.medianCents).toBe(450);
    expect(cell?.p25Cents).toBe(275);
    expect(cell?.p75Cents).toBe(625);
  });

  it("tracks the latest quote date", () => {
    const amounts = [100, 200, 300, 400, 500, 600, 700, 800];
    const cell = buildCell(amounts, [
      "2026-01-01T00:00:00.000Z",
      "2026-06-09T00:00:00.000Z",
      "2026-03-01T00:00:00.000Z",
      "2025-12-31T00:00:00.000Z",
      "2026-02-01T00:00:00.000Z",
      "2026-04-01T00:00:00.000Z",
      "2026-05-01T00:00:00.000Z",
      "2026-01-15T00:00:00.000Z",
    ]);
    expect(cell?.latestQuoteAt).toBe("2026-06-09T00:00:00.000Z");
  });

  it("produces an ascending 21-point quantile grid from min to max", () => {
    const amounts = [800, 100, 300, 200, 700, 400, 600, 500];
    const cell = buildCell(amounts, dates(8));
    const grid = cell?.quantilesCents ?? [];
    expect(grid).toHaveLength(21);
    expect(grid[0]).toBe(100);
    expect(grid[20]).toBe(800);
    for (let i = 1; i < grid.length; i++) {
      expect(grid[i]).toBeGreaterThanOrEqual(grid[i - 1] ?? 0);
    }
  });
});

describe("percentileForAmount", () => {
  const cell = buildCell(
    [100, 200, 300, 400, 500, 600, 700, 800],
    Array.from({ length: 8 }, () => "2026-05-01T00:00:00.000Z"),
  );
  if (!cell) throw new Error("fixture cell unexpectedly suppressed");

  it("returns 0 below the minimum and 100 above the maximum", () => {
    expect(percentileForAmount(cell, 50)).toBe(0);
    expect(percentileForAmount(cell, 900)).toBe(100);
  });

  it("places the median at 50", () => {
    expect(percentileForAmount(cell, 450)).toBeCloseTo(50, 5);
  });

  it("places min at 0 and max at 100 (exact hits)", () => {
    expect(percentileForAmount(cell, 100)).toBe(0);
    expect(percentileForAmount(cell, 800)).toBe(100);
  });

  it("tracks the midrank percentile within tolerance on uniform data", () => {
    // Exact midrank of 300 in [100..800] = (2 + 0.5)/8 = 31.25
    const grid = percentileForAmount(cell, 300);
    expect(Math.abs(grid - 31.25)).toBeLessThan(5);
  });

  it("resolves a fully-flat distribution to 50", () => {
    const flat = buildCell(
      Array.from({ length: 8 }, () => 500),
      Array.from({ length: 8 }, () => "2026-05-01T00:00:00.000Z"),
    );
    if (!flat) throw new Error("flat cell suppressed");
    expect(percentileForAmount(flat, 500)).toBe(50);
  });

  it("is monotone non-decreasing in the amount", () => {
    let prev = -1;
    for (let amount = 50; amount <= 900; amount += 25) {
      const p = percentileForAmount(cell, amount);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });
});

describe("roundedDisplayPercentile", () => {
  it("rounds to the nearest 5", () => {
    expect(roundedDisplayPercentile(37)).toBe(35);
    expect(roundedDisplayPercentile(38)).toBe(40);
    expect(roundedDisplayPercentile(50)).toBe(50);
  });

  it("clamps to the 5–95 display band", () => {
    expect(roundedDisplayPercentile(0)).toBe(5);
    expect(roundedDisplayPercentile(2)).toBe(5);
    expect(roundedDisplayPercentile(100)).toBe(95);
  });

  it("falls back to 50 for non-finite input", () => {
    expect(roundedDisplayPercentile(Number.NaN)).toBe(50);
  });
});

describe("ordinal", () => {
  it("handles standard suffixes", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(4)).toBe("4th");
    expect(ordinal(35)).toBe("35th");
    expect(ordinal(21)).toBe("21st");
  });

  it("handles the 11–13 exceptions", () => {
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(13)).toBe("13th");
    expect(ordinal(113)).toBe("113th");
  });
});

describe("formatCentsAUD", () => {
  it("formats whole dollars with grouping", () => {
    expect(formatCentsAUD(120000)).toBe("$1,200");
    expect(formatCentsAUD(50000)).toBe("$500");
    expect(formatCentsAUD(1050000)).toBe("$10,500");
  });

  it("rounds sub-dollar cents", () => {
    expect(formatCentsAUD(99950)).toBe("$1,000");
  });
});

describe("labels", () => {
  it("labels known quote types", () => {
    expect(labelForQuoteType("smsf_accountant")).toBe("SMSF Accountant");
    expect(labelForQuoteType("conveyancer")).toBe("Conveyancer");
  });

  it("falls back to a humanised unknown type", () => {
    expect(labelForQuoteType("space_lawyer")).toBe("space lawyer");
  });

  it("labels budget bands", () => {
    expect(labelForBudgetBand("2k_5k")).toBe("$2,000 – $5,000");
    expect(labelForBudgetBand("mystery_band")).toBe("mystery band");
  });
});

// ── buildFeeBenchmark ─────────────────────────────────────────────────────────

describe("buildFeeBenchmark", () => {
  it("returns an empty benchmark for an empty corpus", () => {
    const b = buildFeeBenchmark([]);
    expect(b.types).toEqual([]);
    expect(b.consultations).toEqual([]);
    expect(b.totalQuotes).toBe(0);
    expect(b.windowDays).toBe(FEE_BENCHMARK_WINDOW_DAYS);
  });

  it("suppresses a type with fewer than the minimum observations", () => {
    const b = buildFeeBenchmark(series(7, 10000, 1000));
    expect(b.types).toEqual([]);
    expect(b.totalQuotes).toBe(7);
  });

  it("includes a type at the minimum sample with a national cell", () => {
    const b = buildFeeBenchmark(series(8, 10000, 1000));
    expect(b.types).toHaveLength(1);
    const row = b.types[0];
    expect(row?.type).toBe("smsf_accountant");
    expect(row?.label).toBe("SMSF Accountant");
    expect(row?.national.count).toBe(8);
  });

  it("builds state cells only where the state meets the sample floor", () => {
    const bids = [
      ...series(8, 10000, 1000, { state: "NSW" }),
      ...series(3, 50000, 1000, { state: "VIC" }),
    ];
    const b = buildFeeBenchmark(bids);
    const row = b.types[0];
    expect(row?.national.count).toBe(11);
    expect(row?.byState["NSW"]?.count).toBe(8);
    expect(row?.byState["VIC"]).toBeUndefined();
  });

  it("counts null-state observations in national only", () => {
    const bids = [
      ...series(7, 10000, 1000, { state: "NSW" }),
      ob(99000, { state: null }),
    ];
    const b = buildFeeBenchmark(bids);
    const row = b.types[0];
    expect(row?.national.count).toBe(8);
    expect(Object.keys(row?.byState ?? {})).toEqual([]);
  });

  it("skips observations with invalid amounts or empty types", () => {
    const bids = [
      ...series(8, 10000, 1000),
      ob(0),
      ob(-5),
      ob(50000, { type: "" }),
    ];
    const b = buildFeeBenchmark(bids);
    expect(b.types[0]?.national.count).toBe(8);
  });

  it("orders types by corpus size, largest first", () => {
    const bids = [
      ...series(8, 10000, 1000, { type: "tax_agent" }),
      ...series(12, 200000, 5000, { type: "financial_planner" }),
    ];
    const b = buildFeeBenchmark(bids);
    expect(b.types.map((t) => t.type)).toEqual(["financial_planner", "tax_agent"]);
  });

  it("only reports a top budget band when enough briefs exist", () => {
    const bids = series(8, 10000, 1000);
    const fewBriefs = Array.from({ length: 7 }, () => ({
      type: "smsf_accountant",
      budgetBand: "2k_5k",
    }));
    const b = buildFeeBenchmark(bids, fewBriefs);
    expect(b.types[0]?.briefCount).toBe(7);
    expect(b.types[0]?.topBudgetBand).toBeNull();
  });

  it("picks the most common budget band, ignoring not_sure and nulls", () => {
    const bids = series(8, 10000, 1000);
    const briefs = [
      ...Array.from({ length: 5 }, () => ({ type: "smsf_accountant", budgetBand: "2k_5k" })),
      ...Array.from({ length: 3 }, () => ({ type: "smsf_accountant", budgetBand: "500_2k" })),
      ...Array.from({ length: 4 }, () => ({ type: "smsf_accountant", budgetBand: "not_sure" })),
      { type: "smsf_accountant", budgetBand: null },
    ];
    const b = buildFeeBenchmark(bids, briefs);
    expect(b.types[0]?.briefCount).toBe(13);
    expect(b.types[0]?.topBudgetBand).toBe("2k_5k");
  });

  it("aggregates consultations per category with the same suppression rule", () => {
    const bids = series(8, 10000, 1000);
    const consultations = [
      ...Array.from({ length: 8 }, (_, i) => ({ category: "smsf", priceCents: 10000 + i * 1000 })),
      ...Array.from({ length: 3 }, () => ({ category: "general", priceCents: 5000 })),
    ];
    const b = buildFeeBenchmark(bids, [], consultations);
    expect(b.consultations).toHaveLength(1);
    expect(b.consultations[0]?.category).toBe("smsf");
    expect(b.consultations[0]?.label).toBe("Smsf");
    expect(b.consultations[0]?.count).toBe(8);
    expect(b.consultations[0]?.medianCents).toBe(13500);
  });
});

// ── Cell selection + chip payload ─────────────────────────────────────────────

describe("benchmarkCellFor / percentileInfoForBid", () => {
  const benchmark = buildFeeBenchmark([
    ...series(8, 100000, 10000, { state: "NSW" }),
    ...series(4, 500000, 10000, { state: "VIC" }),
  ]);

  it("prefers the state cell when it met the floor", () => {
    const match = benchmarkCellFor(benchmark, "smsf_accountant", "NSW");
    expect(match?.stateUsed).toBe("NSW");
    expect(match?.cell.count).toBe(8);
  });

  it("falls back to national for a suppressed state", () => {
    const match = benchmarkCellFor(benchmark, "smsf_accountant", "VIC");
    expect(match?.stateUsed).toBeNull();
    expect(match?.cell.count).toBe(12);
  });

  it("falls back to national when no state is given", () => {
    const match = benchmarkCellFor(benchmark, "smsf_accountant", null);
    expect(match?.stateUsed).toBeNull();
  });

  it("returns null for an unknown type", () => {
    expect(benchmarkCellFor(benchmark, "tax_agent", "NSW")).toBeNull();
  });

  it("builds chip info with a clamped display percentile", () => {
    const info = percentileInfoForBid(benchmark, "smsf_accountant", "NSW", 100000);
    expect(info).not.toBeNull();
    expect(info?.percentile).toBe(5); // cheapest quote clamps to 5
    expect(info?.typeLabel).toBe("SMSF Accountant");
    expect(info?.stateUsed).toBe("NSW");
    expect(info?.sampleSize).toBe(8);
    expect(info?.windowDays).toBe(FEE_BENCHMARK_WINDOW_DAYS);
  });

  it("returns null chip info for missing type, suppressed type, or bad amount", () => {
    expect(percentileInfoForBid(benchmark, null, "NSW", 100000)).toBeNull();
    expect(percentileInfoForBid(benchmark, "tax_agent", "NSW", 100000)).toBeNull();
    expect(percentileInfoForBid(benchmark, "smsf_accountant", "NSW", 0)).toBeNull();
  });

  it("rounds mid-distribution percentiles to the nearest 5", () => {
    const info = percentileInfoForBid(benchmark, "smsf_accountant", "NSW", 135000);
    expect(info).not.toBeNull();
    expect((info?.percentile ?? 0) % 5).toBe(0);
    expect(info?.percentile).toBeGreaterThanOrEqual(5);
    expect(info?.percentile).toBeLessThanOrEqual(95);
  });
});

// ── Pricing position ──────────────────────────────────────────────────────────

describe("computePricingPosition", () => {
  it("returns no_bids when the advisor has no counted quotes", () => {
    const corpus = series(10, 100000, 5000);
    expect(computePricingPosition(corpus, 1)).toEqual({ status: "no_bids" });
  });

  it("returns insufficient_peers below the peer floor", () => {
    const corpus = [
      ...series(5, 100000, 5000, { advisorId: 7 }),
      ...series(4, 100000, 5000, { advisorId: 8 }),
    ];
    const pos = computePricingPosition(corpus, 7);
    expect(pos.status).toBe("insufficient_peers");
    if (pos.status === "insufficient_peers") {
      expect(pos.peerCount).toBe(4);
      expect(pos.minSample).toBe(FEE_BENCHMARK_MIN_SAMPLE);
      expect(pos.label).toBe("SMSF Accountant");
    }
  });

  it("excludes the advisor's own quotes from the peer distribution", () => {
    // Advisor 7 quotes 900k; 8 peers quote 100k..170k.
    const corpus = [
      ob(900000, { advisorId: 7 }),
      ...series(8, 100000, 10000, { advisorId: 99 }).map((o, i) => ({
        ...o,
        advisorId: 200 + i,
      })),
    ];
    const pos = computePricingPosition(corpus, 7);
    expect(pos.status).toBe("ok");
    if (pos.status === "ok") {
      expect(pos.peerCount).toBe(8);
      expect(pos.typicalCents).toBe(900000);
      expect(pos.percentile).toBe(100); // above every peer quote
      expect(pos.peerMedianCents).toBe(135000);
    }
  });

  it("uses the advisor's most-quoted category as the main type", () => {
    const corpus = [
      // Advisor 7: 1 financial_planner quote, 3 tax_agent quotes
      ob(300000, { advisorId: 7, type: "financial_planner" }),
      ob(40000, { advisorId: 7, type: "tax_agent" }),
      ob(50000, { advisorId: 7, type: "tax_agent" }),
      ob(60000, { advisorId: 7, type: "tax_agent" }),
      // 8 tax_agent peers
      ...series(8, 30000, 5000, { type: "tax_agent" }).map((o, i) => ({
        ...o,
        advisorId: 300 + i,
      })),
    ];
    const pos = computePricingPosition(corpus, 7);
    expect(pos.status).toBe("ok");
    if (pos.status === "ok") {
      expect(pos.type).toBe("tax_agent");
      expect(pos.ownBidCount).toBe(3);
      expect(pos.typicalCents).toBe(50000); // median of 40k/50k/60k
    }
  });

  it("reports the midrank percentile against peers", () => {
    const corpus = [
      ob(135000, { advisorId: 7 }), // exactly the peer median
      ...series(8, 100000, 10000).map((o, i) => ({ ...o, advisorId: 400 + i })),
    ];
    const pos = computePricingPosition(corpus, 7);
    expect(pos.status).toBe("ok");
    if (pos.status === "ok") {
      expect(pos.percentile).toBe(50);
    }
  });
});

// ── Data plumbing (mocked Supabase) ───────────────────────────────────────────

describe("getFeeBenchmark / getAdvisorPricingPosition (mocked DB)", () => {
  beforeEach(() => {
    for (const key of Object.keys(tableData)) delete tableData[key];
  });

  function bidRow(amount: number, advisorId: number, types: string[], location: string | null) {
    return {
      bid_amount: amount,
      created_at: "2026-05-20T00:00:00.000Z",
      advisor_id: advisorId,
      advisor_auctions: { advisor_types: types, location },
    };
  }

  it("maps bid rows into a benchmark and skips junk rows", async () => {
    tableData["advisor_auction_bids"] = {
      data: [
        ...Array.from({ length: 8 }, (_, i) =>
          bidRow(100000 + i * 5000, 50 + i, ["smsf_accountant"], "NSW"),
        ),
        bidRow(0, 99, ["smsf_accountant"], "NSW"), // invalid amount
        { ...bidRow(50000, 98, [], "NSW") }, // no advisor types
        bidRow(70000, 97, ["tax_agent"], "Sydney-ish"), // unknown state → national only
      ],
      error: null,
    };
    tableData["advisor_auctions"] = { data: [], error: null };
    tableData["consultations"] = { data: [], error: null };

    const b = await getFeeBenchmark();
    expect(b.types).toHaveLength(1);
    expect(b.types[0]?.type).toBe("smsf_accountant");
    expect(b.types[0]?.national.count).toBe(8);
    expect(b.types[0]?.byState["NSW"]?.count).toBe(8);
  });

  it("continues without consultations when that source errors", async () => {
    tableData["advisor_auction_bids"] = {
      data: Array.from({ length: 8 }, (_, i) =>
        bidRow(100000 + i * 5000, 50 + i, ["smsf_accountant"], "NSW"),
      ),
      error: null,
    };
    tableData["advisor_auctions"] = { data: [], error: null };
    tableData["consultations"] = { data: null, error: { message: "relation does not exist" } };

    const b = await getFeeBenchmark();
    expect(b.types).toHaveLength(1);
    expect(b.consultations).toEqual([]);
  });

  it("returns an empty benchmark when the bid query errors", async () => {
    tableData["advisor_auction_bids"] = { data: null, error: { message: "boom" } };
    tableData["advisor_auctions"] = { data: [], error: null };
    tableData["consultations"] = { data: [], error: null };

    const b = await getFeeBenchmark();
    expect(b.types).toEqual([]);
    expect(b.totalQuotes).toBe(0);
  });

  it("computes an advisor's pricing position from the same corpus", async () => {
    tableData["advisor_auction_bids"] = {
      data: [
        bidRow(200000, 7, ["smsf_accountant"], "NSW"),
        ...Array.from({ length: 8 }, (_, i) =>
          bidRow(100000 + i * 10000, 50 + i, ["smsf_accountant"], "NSW"),
        ),
      ],
      error: null,
    };
    tableData["advisor_auctions"] = { data: [], error: null };
    tableData["consultations"] = { data: [], error: null };

    const pos = await getAdvisorPricingPosition(7);
    expect(pos.status).toBe("ok");
    if (pos.status === "ok") {
      expect(pos.typicalCents).toBe(200000);
      expect(pos.peerCount).toBe(8);
      expect(pos.percentile).toBe(100);
    }
  });
});
