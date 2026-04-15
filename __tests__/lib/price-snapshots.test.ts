import { describe, it, expect, beforeEach, vi } from "vitest";

interface Row {
  id: number;
  [k: string]: unknown;
}

let brokerSnaps: Row[] = [];
let commoditySnaps: Row[] = [];
let nextId = 1;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const builder = (table: string) => {
      const state: {
        op: "select" | "insert";
        filters: Record<string, unknown>;
        since?: string;
        order?: { col: string; asc: boolean };
        limitN?: number;
        singleMode?: "single" | "maybeSingle";
      } = { op: "select", filters: {} };
      const api: Record<string, unknown> = {};
      api.select = () => api;
      api.insert = (payload: Row) => {
        if (table === "broker_price_snapshots") {
          brokerSnaps.push({ ...payload, id: nextId++ });
        } else if (table === "commodity_price_snapshots") {
          commoditySnaps.push({ ...payload, id: nextId++ });
        }
        return Promise.resolve({ error: null });
      };
      api.eq = (col: string, val: unknown) => {
        state.filters[col] = val;
        return api;
      };
      api.gte = (col: string, val: string) => {
        if (col === "captured_at") state.since = val;
        return api;
      };
      api.order = (col: string, opts?: { ascending?: boolean }) => {
        state.order = { col, asc: opts?.ascending !== false };
        return api;
      };
      api.limit = (n: number) => {
        state.limitN = n;
        return api;
      };
      api.maybeSingle = () => {
        state.singleMode = "maybeSingle";
        return run();
      };
      (api as Record<string, unknown>).then = (
        resolve: (v: unknown) => void,
      ) => {
        resolve(run());
      };

      function run() {
        const rows =
          table === "broker_price_snapshots"
            ? brokerSnaps
            : table === "commodity_price_snapshots"
              ? commoditySnaps
              : [];
        let matched = rows.filter((r) =>
          Object.entries(state.filters).every(([k, v]) => r[k] === v),
        );
        if (state.since) {
          matched = matched.filter(
            (r) => String(r.captured_at) >= state.since!,
          );
        }
        if (state.order) {
          const { col, asc } = state.order;
          matched = [...matched].sort((a, b) => {
            const va = a[col] as string | number;
            const vb = b[col] as string | number;
            if (va < vb) return asc ? -1 : 1;
            if (va > vb) return asc ? 1 : -1;
            return 0;
          });
        }
        if (state.limitN != null) matched = matched.slice(0, state.limitN);
        if (state.singleMode === "maybeSingle") {
          return Promise.resolve({ data: matched[0] || null, error: null });
        }
        return Promise.resolve({ data: matched, error: null });
      }
      return api;
    };
    return { from: builder };
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

import {
  parseFeeNumeric,
  classifyFreshness,
  captureBrokerSnapshot,
  captureBrokerSnapshotsBatch,
  readBrokerHistory,
  readLatestBrokerSnapshot,
  captureCommoditySnapshot,
  readCommodityHistory,
  type BrokerRow,
} from "@/lib/price-snapshots";

beforeEach(() => {
  brokerSnaps = [];
  commoditySnaps = [];
  nextId = 1;
});

describe("parseFeeNumeric", () => {
  it("parses a simple dollar amount", () => {
    expect(parseFeeNumeric("$3.00")).toBe(3);
    expect(parseFeeNumeric("$7")).toBe(7);
    expect(parseFeeNumeric("$ 15.50")).toBe(15.5);
  });

  it("prefers percent over dollar when both are present", () => {
    expect(parseFeeNumeric("0.50% min $5")).toBe(0.5);
    expect(parseFeeNumeric("$3 or 0.10%")).toBe(0.1);
  });

  it("treats 'Free' as 0", () => {
    expect(parseFeeNumeric("Free")).toBe(0);
    expect(parseFeeNumeric("FREE")).toBe(0);
    expect(parseFeeNumeric("none")).toBe(0);
  });

  it("returns null for N/A and unknown", () => {
    expect(parseFeeNumeric("N/A")).toBeNull();
    expect(parseFeeNumeric("unknown")).toBeNull();
  });

  it("returns null for empty/null/undefined", () => {
    expect(parseFeeNumeric(null)).toBeNull();
    expect(parseFeeNumeric(undefined)).toBeNull();
    expect(parseFeeNumeric("")).toBeNull();
  });

  it("falls back to bare number when no $ or %", () => {
    expect(parseFeeNumeric("5")).toBe(5);
    expect(parseFeeNumeric("12.5")).toBe(12.5);
  });
});

describe("classifyFreshness", () => {
  const now = new Date("2026-04-15T12:00:00Z");

  it("classifies <6h as fresh", () => {
    const capturedAt = new Date("2026-04-15T08:00:00Z").toISOString();
    expect(classifyFreshness(capturedAt, now)).toBe("fresh");
  });

  it("classifies 6-36h as recent", () => {
    const capturedAt = new Date("2026-04-14T10:00:00Z").toISOString();
    expect(classifyFreshness(capturedAt, now)).toBe("recent");
  });

  it("classifies >36h as stale", () => {
    const capturedAt = new Date("2026-04-10T12:00:00Z").toISOString();
    expect(classifyFreshness(capturedAt, now)).toBe("stale");
  });

  it("classifies null as unknown", () => {
    expect(classifyFreshness(null, now)).toBe("unknown");
    expect(classifyFreshness(undefined, now)).toBe("unknown");
  });

  it("classifies invalid timestamp as unknown", () => {
    expect(classifyFreshness("not-a-date", now)).toBe("unknown");
  });
});

describe("captureBrokerSnapshot", () => {
  it("writes a row with parsed numeric fields", async () => {
    const broker: BrokerRow = {
      id: 1,
      slug: "stake",
      status: "active",
      asx_fee: "$3.00",
      us_fee: "$0 or 0.25%",
      fx_rate: 0.6,
      inactivity_fee: "Free",
      min_deposit: "$500",
    };
    const r = await captureBrokerSnapshot(broker);
    expect(r.ok).toBe(true);
    expect(brokerSnaps).toHaveLength(1);
    const row = brokerSnaps[0];
    expect(row.broker_slug).toBe("stake");
    expect(row.asx_fee_value).toBe(3);
    expect(row.us_fee_value).toBe(0.25);
    expect(row.inactivity_fee_value).toBe(0);
    expect(row.min_deposit_value).toBe(500);
  });

  it("handles null fee fields gracefully", async () => {
    const r = await captureBrokerSnapshot({
      id: 2,
      slug: "barebones",
      asx_fee: null,
      us_fee: null,
    });
    expect(r.ok).toBe(true);
    expect(brokerSnaps[0].asx_fee_value).toBeNull();
  });
});

describe("captureBrokerSnapshotsBatch", () => {
  it("processes every row and reports counts", async () => {
    const list: BrokerRow[] = [
      { id: 1, slug: "a", asx_fee: "$5" },
      { id: 2, slug: "b", asx_fee: "$10" },
      { id: 3, slug: "c", asx_fee: "$15" },
    ];
    const r = await captureBrokerSnapshotsBatch(list);
    expect(r.total).toBe(3);
    expect(r.succeeded).toBe(3);
    expect(r.failed).toBe(0);
    expect(brokerSnaps).toHaveLength(3);
  });
});

describe("readBrokerHistory + readLatestBrokerSnapshot", () => {
  it("returns snapshots newer than the since cutoff in ascending order", async () => {
    brokerSnaps = [
      { id: 1, broker_slug: "stake", captured_at: "2026-04-10T00:00:00Z" },
      { id: 2, broker_slug: "stake", captured_at: "2026-04-12T00:00:00Z" },
      { id: 3, broker_slug: "stake", captured_at: "2026-04-14T00:00:00Z" },
      { id: 4, broker_slug: "other", captured_at: "2026-04-14T00:00:00Z" },
    ];
    const rows = await readBrokerHistory("stake", "2026-04-11T00:00:00Z");
    expect(rows).toHaveLength(2);
    expect(rows[0].captured_at).toBe("2026-04-12T00:00:00Z");
    expect(rows[1].captured_at).toBe("2026-04-14T00:00:00Z");
  });

  it("latest returns the most recent row", async () => {
    brokerSnaps = [
      { id: 1, broker_slug: "stake", captured_at: "2026-04-10T00:00:00Z" },
      { id: 2, broker_slug: "stake", captured_at: "2026-04-15T00:00:00Z" },
    ];
    const latest = await readLatestBrokerSnapshot("stake");
    expect(latest?.captured_at).toBe("2026-04-15T00:00:00Z");
  });
});

describe("commodity snapshots", () => {
  it("captures and reads commodity history", async () => {
    await captureCommoditySnapshot({
      entityKind: "stock",
      entityRef: "wds",
      sectorSlug: "oil-gas",
      priceMinorUnits: 3250,
    });
    await captureCommoditySnapshot({
      entityKind: "stock",
      entityRef: "WDS",
      sectorSlug: "oil-gas",
      priceMinorUnits: 3300,
    });
    // Mock override: the mock stores 'captured_at' as undefined
    // unless we stamp it; patch the rows so ordering works
    commoditySnaps[0].captured_at = "2026-04-14T00:00:00Z";
    commoditySnaps[1].captured_at = "2026-04-15T00:00:00Z";

    const rows = await readCommodityHistory({
      entityKind: "stock",
      entityRef: "WDS",
      sinceIso: "2026-04-13T00:00:00Z",
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].price_minor_units).toBe(3250);
  });
});
