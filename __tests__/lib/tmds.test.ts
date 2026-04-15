import { describe, it, expect, beforeEach, vi } from "vitest";

interface Row {
  id: number;
  product_type: string;
  product_ref: string;
  product_name: string;
  tmd_url: string;
  tmd_version: string;
  reviewed_at: string | null;
  valid_from: string;
  valid_until: string | null;
}

let rows: Row[] = [];
let nextId = 1;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const builder = (table: string) => {
      const state: {
        op: "select" | "upsert";
        typeFilter?: string;
        refFilter?: string;
        lteFrom?: string;
        orExpr?: string;
        upsertPayload?: Partial<Row>;
        isTmds: boolean;
      } = {
        op: "select",
        isTmds: table === "tmds",
      };
      const api: Record<string, unknown> = {};
      api.select = () => api;
      api.upsert = (payload: Partial<Row>) => {
        if (state.isTmds) {
          const existing = rows.find(
            (r) =>
              r.product_type === payload.product_type &&
              r.product_ref === payload.product_ref &&
              r.tmd_version === payload.tmd_version,
          );
          if (existing) {
            Object.assign(existing, payload);
            state.upsertPayload = existing;
          } else {
            const newRow: Row = {
              id: nextId++,
              product_type: payload.product_type || "",
              product_ref: payload.product_ref || "",
              product_name: payload.product_name || "",
              tmd_url: payload.tmd_url || "",
              tmd_version: payload.tmd_version || "",
              reviewed_at: payload.reviewed_at ?? null,
              valid_from: payload.valid_from || new Date().toISOString(),
              valid_until: payload.valid_until ?? null,
            };
            rows.push(newRow);
            state.upsertPayload = newRow;
          }
        }
        return api;
      };
      api.eq = (col: string, val: string) => {
        if (col === "product_type") state.typeFilter = val;
        if (col === "product_ref") state.refFilter = val;
        return api;
      };
      api.lte = (col: string, val: string) => {
        if (col === "valid_from") state.lteFrom = val;
        return api;
      };
      api.or = (expr: string) => {
        state.orExpr = expr;
        return api;
      };
      api.order = () => api;
      api.limit = () => api;
      api.maybeSingle = () => {
        const now = new Date().toISOString();
        const matches = rows.filter(
          (r) =>
            (!state.typeFilter || r.product_type === state.typeFilter) &&
            (!state.refFilter || r.product_ref === state.refFilter) &&
            (!state.lteFrom || r.valid_from <= state.lteFrom) &&
            (!r.valid_until || r.valid_until >= now),
        );
        matches.sort((a, b) =>
          a.valid_from < b.valid_from ? 1 : a.valid_from > b.valid_from ? -1 : 0,
        );
        return Promise.resolve({ data: matches[0] || null, error: null });
      };
      api.single = () => {
        return Promise.resolve({
          data: state.upsertPayload ? { id: state.upsertPayload.id } : null,
          error: null,
        });
      };
      api.then = (resolve: (v: unknown) => void) => {
        if (state.isTmds) {
          return resolve({ data: rows, error: null });
        }
        return resolve({ data: [], error: null });
      };
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

import { upsertTmd, getCurrentTmd, listAllTmds } from "@/lib/tmds";

beforeEach(() => {
  rows = [];
  nextId = 1;
});

describe("upsertTmd", () => {
  it("rejects invalid product_type", async () => {
    const r = await upsertTmd({
      // @ts-expect-error runtime validation
      productType: "car",
      productRef: "tesla",
      productName: "Tesla",
      tmdUrl: "https://x.co",
      tmdVersion: "v1",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("invalid_product_type");
  });

  it("rejects non-http urls", async () => {
    const r = await upsertTmd({
      productType: "broker",
      productRef: "stake",
      productName: "Stake",
      tmdUrl: "javascript:alert(1)",
      tmdVersion: "v1",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("invalid_tmd_url");
  });

  it("inserts a valid TMD", async () => {
    const r = await upsertTmd({
      productType: "broker",
      productRef: "stake",
      productName: "Stake Trading",
      tmdUrl: "https://example.com/tmd.pdf",
      tmdVersion: "v3.1",
    });
    expect(r.ok).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0].product_type).toBe("broker");
  });
});

describe("getCurrentTmd", () => {
  it("returns the most recent valid TMD", async () => {
    await upsertTmd({
      productType: "broker",
      productRef: "stake",
      productName: "Stake",
      tmdUrl: "https://example.com/v1.pdf",
      tmdVersion: "v1",
      validFrom: "2026-01-01T00:00:00Z",
    });
    await upsertTmd({
      productType: "broker",
      productRef: "stake",
      productName: "Stake",
      tmdUrl: "https://example.com/v2.pdf",
      tmdVersion: "v2",
      validFrom: "2026-03-01T00:00:00Z",
    });
    const current = await getCurrentTmd("broker", "stake");
    expect(current?.tmd_version).toBe("v2");
  });
});

describe("listAllTmds", () => {
  it("returns every row", async () => {
    await upsertTmd({
      productType: "broker",
      productRef: "a",
      productName: "A",
      tmdUrl: "https://a.co/t.pdf",
      tmdVersion: "v1",
    });
    await upsertTmd({
      productType: "advisor",
      productRef: "b",
      productName: "B",
      tmdUrl: "https://b.co/t.pdf",
      tmdVersion: "v1",
    });
    const all = await listAllTmds();
    expect(all).toHaveLength(2);
  });
});
