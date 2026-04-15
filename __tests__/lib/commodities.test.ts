import { describe, it, expect, beforeEach, vi } from "vitest";

interface SectorRow {
  id: number;
  slug: string;
  display_name: string;
  hero_description: string;
  hero_stats: Record<string, string> | null;
  esg_risk_rating: string;
  regulator_notes: string | null;
  status: string;
  launched_at: string | null;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

interface StockRow {
  id: number;
  sector_slug: string;
  ticker: string;
  company_name: string;
  market_cap_bucket: string | null;
  dividend_yield_pct: number | null;
  pe_ratio: number | null;
  blurb: string | null;
  primary_exposure: string | null;
  included_in_indices: string[] | null;
  foreign_ownership_risk: string | null;
  last_reviewed_at: string | null;
  display_order: number;
  status: string;
}

interface EtfRow {
  id: number;
  sector_slug: string;
  ticker: string;
  name: string;
  issuer: string | null;
  mer_pct: number | null;
  underlying_exposure: string | null;
  domicile: string | null;
  distribution_frequency: string | null;
  blurb: string | null;
  display_order: number;
  status: string;
}

let sectorRows: SectorRow[] = [];
let stockRows: StockRow[] = [];
let etfRows: EtfRow[] = [];
let nextId = 1;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const builder = (table: string) => {
      const state: {
        op: "select" | "upsert";
        filters: Record<string, string>;
        order?: { col: string; asc: boolean };
        limitN?: number;
        upsertPayload?: Record<string, unknown>;
        singleMode?: "single" | "maybeSingle";
      } = { op: "select", filters: {} };

      const api: Record<string, unknown> = {};
      api.select = () => api;
      api.upsert = (payload: Record<string, unknown>) => {
        state.op = "upsert";
        state.upsertPayload = payload;
        return api;
      };
      api.eq = (col: string, val: string) => {
        state.filters[col] = String(val);
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
      api.single = () => {
        state.singleMode = "single";
        return run();
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

      function rowsFor(): Record<string, unknown>[] {
        if (table === "commodity_sectors") return sectorRows as unknown as Record<string, unknown>[];
        if (table === "commodity_stocks") return stockRows as unknown as Record<string, unknown>[];
        if (table === "commodity_etfs") return etfRows as unknown as Record<string, unknown>[];
        return [];
      }

      function run() {
        if (state.op === "upsert" && state.upsertPayload) {
          const p = state.upsertPayload;
          if (table === "commodity_sectors") {
            const idx = sectorRows.findIndex((r) => r.slug === p.slug);
            if (idx >= 0) {
              Object.assign(sectorRows[idx], p);
              return Promise.resolve({
                data: { id: sectorRows[idx].id },
                error: null,
              });
            }
            const row = { ...(p as unknown as SectorRow), id: nextId++ };
            sectorRows.push(row);
            return Promise.resolve({ data: { id: row.id }, error: null });
          }
          if (table === "commodity_stocks") {
            const idx = stockRows.findIndex(
              (r) => r.sector_slug === p.sector_slug && r.ticker === p.ticker,
            );
            if (idx >= 0) {
              Object.assign(stockRows[idx], p);
              return Promise.resolve({ data: null, error: null });
            }
            const row = {
              ...(p as unknown as StockRow),
              id: nextId++,
              status: (p as { status?: string }).status || "active",
            };
            stockRows.push(row);
            return Promise.resolve({ data: null, error: null });
          }
          if (table === "commodity_etfs") {
            const idx = etfRows.findIndex(
              (r) => r.sector_slug === p.sector_slug && r.ticker === p.ticker,
            );
            if (idx >= 0) {
              Object.assign(etfRows[idx], p);
              return Promise.resolve({ data: null, error: null });
            }
            // Match the DB default so listSectorEtfs (which filters
            // status=active) finds the row without the caller needing
            // to set it.
            const row = {
              ...(p as unknown as EtfRow),
              id: nextId++,
              status: (p as { status?: string }).status || "active",
            };
            etfRows.push(row);
            return Promise.resolve({ data: null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }

        let matched = rowsFor().filter((r) =>
          Object.entries(state.filters).every(([k, v]) => r[k] === v),
        );
        if (state.order) {
          const { col, asc } = state.order;
          matched = [...matched].sort((a, b) => {
            const va = a[col] as number;
            const vb = b[col] as number;
            if (va < vb) return asc ? -1 : 1;
            if (va > vb) return asc ? 1 : -1;
            return 0;
          });
        }
        if (state.limitN != null) matched = matched.slice(0, state.limitN);
        if (state.singleMode === "single") {
          return Promise.resolve({ data: matched[0] || null, error: null });
        }
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
  getSector,
  listActiveSectors,
  listSectorStocks,
  listSectorEtfs,
  upsertSector,
  upsertStock,
  upsertEtf,
} from "@/lib/commodities";

beforeEach(() => {
  sectorRows = [];
  stockRows = [];
  etfRows = [];
  nextId = 1;
});

describe("upsertSector", () => {
  it("rejects a slug with uppercase or spaces", async () => {
    const r = await upsertSector({
      slug: "Oil Gas",
      displayName: "Oil",
      heroDescription: "x",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("slug_invalid");
  });

  it("inserts a valid sector", async () => {
    const r = await upsertSector({
      slug: "oil-gas",
      displayName: "Oil & Gas",
      heroDescription: "A sector description long enough.",
      heroStats: { exports: "$69B" },
      esgRiskRating: "high",
    });
    expect(r.ok).toBe(true);
    expect(sectorRows).toHaveLength(1);
    expect(sectorRows[0].slug).toBe("oil-gas");
  });

  it("updates an existing sector on slug conflict", async () => {
    await upsertSector({
      slug: "oil-gas",
      displayName: "Oil & Gas",
      heroDescription: "First draft.",
    });
    await upsertSector({
      slug: "oil-gas",
      displayName: "Oil & Gas",
      heroDescription: "Second draft.",
    });
    expect(sectorRows).toHaveLength(1);
    expect(sectorRows[0].hero_description).toBe("Second draft.");
  });
});

describe("upsertStock", () => {
  it("rejects non-ticker strings", async () => {
    const r = await upsertStock({
      sectorSlug: "oil-gas",
      ticker: "lowercase",
      companyName: "x",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("ticker_invalid");
  });

  it("upper-cases the ticker and inserts", async () => {
    const r = await upsertStock({
      sectorSlug: "oil-gas",
      ticker: "wds",
      companyName: "Woodside Energy",
      marketCapBucket: "mega",
      primaryExposure: "producer",
    });
    expect(r.ok).toBe(true);
    expect(stockRows[0].ticker).toBe("WDS");
  });
});

describe("upsertEtf", () => {
  it("rejects bad tickers", async () => {
    const r = await upsertEtf({
      sectorSlug: "oil-gas",
      ticker: "too-long-ticker",
      name: "x",
    });
    expect(r.ok).toBe(false);
  });

  it("inserts a clean ETF row", async () => {
    const r = await upsertEtf({
      sectorSlug: "oil-gas",
      ticker: "OOO",
      name: "BetaShares Crude Oil",
      merPct: 0.69,
      domicile: "AU",
    });
    expect(r.ok).toBe(true);
    expect(etfRows[0].mer_pct).toBe(0.69);
  });
});

describe("reads", () => {
  it("getSector + listSectorStocks return seeded data", async () => {
    await upsertSector({
      slug: "oil-gas",
      displayName: "Oil & Gas",
      heroDescription: "Sector description that is long enough for validation.",
    });
    await upsertStock({
      sectorSlug: "oil-gas",
      ticker: "WDS",
      companyName: "Woodside",
    });
    const sector = await getSector("oil-gas");
    expect(sector?.display_name).toBe("Oil & Gas");
    const stocks = await listSectorStocks("oil-gas");
    expect(stocks).toHaveLength(1);
  });

  it("listActiveSectors only returns active rows", async () => {
    await upsertSector({
      slug: "oil-gas",
      displayName: "Oil & Gas",
      heroDescription: "active sector description for testing",
      status: "active",
    });
    await upsertSector({
      slug: "rare-earths",
      displayName: "Rare earths",
      heroDescription: "draft sector description for testing",
      status: "draft",
    });
    const active = await listActiveSectors();
    expect(active).toHaveLength(1);
    expect(active[0].slug).toBe("oil-gas");
  });

  it("listSectorEtfs filters by sector", async () => {
    await upsertEtf({
      sectorSlug: "oil-gas",
      ticker: "OOO",
      name: "BetaShares Crude",
    });
    await upsertEtf({
      sectorSlug: "uranium",
      ticker: "URNM",
      name: "Sprott Uranium",
    });
    const oil = await listSectorEtfs("oil-gas");
    expect(oil).toHaveLength(1);
    expect(oil[0].ticker).toBe("OOO");
  });
});
