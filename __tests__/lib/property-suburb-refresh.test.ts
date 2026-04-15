/**
 * property-suburb-refresh unit tests.
 *
 * Uses an in-memory mock supabase that captures writes so we can
 * assert on the diff + log row shape.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let currentSuburb: Record<string, number | null> | null = null;
let lastUpdate: Record<string, unknown> | null = null;
let lastLog: Record<string, unknown> | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, _val: string) => ({
          maybeSingle: async () => ({ data: currentSuburb, error: null }),
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: async () => {
          lastUpdate = { table, payload };
          return { error: null };
        },
      }),
      insert: async (payload: Record<string, unknown>) => {
        if (table === "property_suburb_refresh_log") lastLog = payload;
        return { error: null };
      },
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

import { refreshSuburb } from "@/lib/property-suburb-refresh";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  currentSuburb = null;
  lastUpdate = null;
  lastLog = null;
  vi.restoreAllMocks();
  delete process.env.CORELOGIC_API_KEY;
  delete process.env.CORELOGIC_API_URL;
  delete process.env.SQM_RESEARCH_API_KEY;
  delete process.env.SQM_RESEARCH_API_URL;
});

afterEach(() => {
  for (const k of Object.keys(process.env)) delete process.env[k];
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("refreshSuburb — stub provider (no env vars)", () => {
  it("returns empty diff and never touches suburb_data", async () => {
    const r = await refreshSuburb("bondi-nsw-2026", "NSW");
    expect(r.provider).toBe("stub");
    expect(r.fieldsChanged).toEqual({});
    expect(lastUpdate).toBeNull();
    // Still logs an audit row so the cron looks healthy
    expect(lastLog).not.toBeNull();
    expect((lastLog as { provider: string }).provider).toBe("stub");
  });
});

describe("refreshSuburb — corelogic happy path", () => {
  beforeEach(() => {
    process.env.CORELOGIC_API_KEY = "token-abc";
  });

  it("computes a diff of only changed fields and updates suburb_data", async () => {
    currentSuburb = {
      median_house_price: 100000000,
      median_unit_price: 60000000,
      rental_yield: 3.5,
      vacancy_rate: 2.0,
      capital_growth_10yr: 50,
      sales_volume_12mo: 200,
      median_rent_weekly: 750,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          median_house: 110000000, // changed
          median_unit: 60000000, // same
          rental_yield: 3.8, // changed
          vacancy_rate: 2.0, // same
          capital_growth_10yr: null, // null — don't overwrite
          sales_volume_12mo: 250,
          median_rent_weekly: 800,
        }),
      })),
    );

    const r = await refreshSuburb("bondi-nsw-2026", "NSW");
    expect(r.provider).toBe("corelogic");
    expect(r.error).toBeUndefined();

    // Only 4 of 7 fields actually changed
    expect(Object.keys(r.fieldsChanged).sort()).toEqual([
      "median_house_price",
      "median_rent_weekly",
      "rental_yield",
      "sales_volume_12mo",
    ]);
    expect(r.fieldsChanged.median_house_price).toEqual([100000000, 110000000]);

    // Update payload contains the same 4 fields (plus updated_at)
    expect(lastUpdate).not.toBeNull();
    const payload = (lastUpdate as { payload: Record<string, unknown> }).payload;
    expect(payload.median_house_price).toBe(110000000);
    expect(payload.rental_yield).toBe(3.8);
    expect(payload.median_unit_price).toBeUndefined(); // unchanged → not in update
    expect(payload.capital_growth_10yr).toBeUndefined(); // null → not overwritten
    expect(payload.updated_at).toBeTruthy();
  });

  it("returns empty diff when nothing changed and skips update", async () => {
    currentSuburb = {
      median_house_price: 100000000,
      median_unit_price: 60000000,
      rental_yield: 3.5,
      vacancy_rate: 2.0,
      capital_growth_10yr: 50,
      sales_volume_12mo: 200,
      median_rent_weekly: 750,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          median_house: 100000000,
          median_unit: 60000000,
          rental_yield: 3.5,
          vacancy_rate: 2.0,
          capital_growth_10yr: 50,
          sales_volume_12mo: 200,
          median_rent_weekly: 750,
        }),
      })),
    );

    const r = await refreshSuburb("bondi-nsw-2026", "NSW");
    expect(r.fieldsChanged).toEqual({});
    expect(lastUpdate).toBeNull();
  });

  it("never overwrites an existing value with null from provider", async () => {
    currentSuburb = { median_house_price: 100000000 };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ median_house: null }),
      })),
    );

    const r = await refreshSuburb("bondi-nsw-2026", "NSW");
    expect(r.fieldsChanged).toEqual({});
    expect(lastUpdate).toBeNull();
  });

  it("logs an error row when the provider fetch 500s", async () => {
    currentSuburb = { median_house_price: 100000000 };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 502,
        json: async () => ({}),
      })),
    );

    const r = await refreshSuburb("bondi-nsw-2026", "NSW");
    expect(r.error).toContain("corelogic HTTP 502");
    expect(lastUpdate).toBeNull();
    expect(lastLog).not.toBeNull();
    const logRow = lastLog as { fields_changed: { __error?: string } };
    expect(logRow.fields_changed.__error).toContain("corelogic HTTP 502");
  });

  it("handles a missing suburb row gracefully", async () => {
    currentSuburb = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ median_house: 100000000 }),
      })),
    );
    const r = await refreshSuburb("ghost-vic-0000", "VIC");
    expect(r.error).toBe("suburb row not found");
    expect(r.fieldsChanged).toEqual({});
  });
});

describe("refreshSuburb — sqm provider", () => {
  beforeEach(() => {
    process.env.SQM_RESEARCH_API_KEY = "sqm-token";
  });

  it("maps sqm response field names to the canonical schema", async () => {
    currentSuburb = {
      median_house_price: 80000000,
      median_unit_price: null,
      rental_yield: 4.0,
      vacancy_rate: null,
      capital_growth_10yr: null,
      sales_volume_12mo: null,
      median_rent_weekly: null,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          median_house: 85000000,
          yield: 4.3,
          weekly_rent: 780,
        }),
      })),
    );

    const r = await refreshSuburb("st-kilda-vic-3182", "VIC");
    expect(r.provider).toBe("sqm");
    expect(r.fieldsChanged.median_house_price).toEqual([80000000, 85000000]);
    expect(r.fieldsChanged.rental_yield).toEqual([4.0, 4.3]);
    expect(r.fieldsChanged.median_rent_weekly).toEqual([null, 780]);
  });
});
