import { describe, it, expect, vi, beforeEach } from "vitest";

// Bypass the Next.js unstable_cache wrapper so functions execute directly.
vi.mock("@/lib/cache", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cache")>("@/lib/cache");
  return { ...actual, cached: (fn: unknown) => fn };
});

// ------------------------------------------------------------------
// Shared Supabase chain stub.
// All chainable query methods return `chain` so any combination of
// .select().eq().order().limit() etc. works without per-function wiring.
// Tests set `dbData` / `dbError` before each call.
// ------------------------------------------------------------------
let dbData: unknown = null;
let dbError: unknown = null;

const chain: Record<string, unknown> = {
  then: (
    res: (v: { data: unknown; error: unknown }) => unknown,
    rej?: (e: unknown) => unknown
  ) => Promise.resolve({ data: dbData, error: dbError }).then(res, rej),
};
for (const m of ["select", "eq", "order", "limit"]) {
  chain[m] = () => chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: vi.fn(() => chain) })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import {
  getNonResidentTaxBrackets,
  getResidentTaxBrackets,
  getDtaCountries,
  getDaspRates,
  getWithholdingRates,
  getPropertyRules,
  getPropertyRuleValue,
  getDataCategories,
  getChangeLog,
  getDefaultWHT,
} from "@/lib/fi-data-server";

beforeEach(() => {
  dbData = null;
  dbError = null;
});

// ── getNonResidentTaxBrackets ────────────────────────────────────────────

describe("getNonResidentTaxBrackets", () => {
  it("returns static fallback when DB is empty", async () => {
    dbData = [];
    const result = await getNonResidentTaxBrackets();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("rate");
    expect(result[0]).toHaveProperty("from");
  });

  it("returns mapped brackets from DB when rows present", async () => {
    dbData = [
      {
        income_from: 0,
        income_to: 18200,
        rate: 0,
        description: "Tax free threshold",
        sort_order: 1,
      },
      {
        income_from: 18201,
        income_to: 45000,
        rate: 19,
        description: "19c for each dollar",
        sort_order: 2,
      },
    ];
    const result = await getNonResidentTaxBrackets();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      from: 0,
      to: 18200,
      rate: 0,
      description: "Tax free threshold",
    });
    expect(result[1].rate).toBe(19);
  });

  it("returns static fallback when DB returns an error", async () => {
    dbError = { message: "connection refused" };
    dbData = null;
    const result = await getNonResidentTaxBrackets();
    expect(result.length).toBeGreaterThan(0);
  });
});

// ── getResidentTaxBrackets ───────────────────────────────────────────────

describe("getResidentTaxBrackets", () => {
  it("returns static fallback when DB is empty", async () => {
    dbData = [];
    const result = await getResidentTaxBrackets();
    expect(result.length).toBeGreaterThan(0);
  });

  it("maps resident bracket rows correctly, including null income_to", async () => {
    dbData = [
      {
        income_from: 0,
        income_to: null,
        rate: 0.19,
        description: "Resident first bracket",
        sort_order: 1,
      },
    ];
    const result = await getResidentTaxBrackets();
    expect(result[0].from).toBe(0);
    expect(result[0].to).toBeNull();
    expect(result[0].rate).toBe(0.19);
    expect(result[0].description).toBe("Resident first bracket");
  });
});

// ── getDtaCountries ──────────────────────────────────────────────────────

describe("getDtaCountries", () => {
  it("returns static fallback when DB is empty", async () => {
    dbData = [];
    const result = await getDtaCountries();
    expect(result.length).toBeGreaterThan(0);
  });

  it("maps DB row fields to camelCase DTACountry shape", async () => {
    dbData = [
      {
        country: "United States",
        country_code: "US",
        has_dta: true,
        dividend_wht: 15,
        interest_wht: 10,
        royalties_wht: 5,
        dta_effective_year: 1983,
        notes: null,
      },
    ];
    const result = await getDtaCountries();
    expect(result[0]).toMatchObject({
      country: "United States",
      countryCode: "US",
      hasDTA: true,
      dividendWHT: 15,
      interestWHT: 10,
      royaltiesWHT: 5,
      dtaEffectiveYear: 1983,
    });
    expect(result[0].notes).toBeUndefined();
  });

  it("converts null dta_effective_year to undefined and preserves notes", async () => {
    dbData = [
      {
        country: "France",
        country_code: "FR",
        has_dta: true,
        dividend_wht: 20,
        interest_wht: 15,
        royalties_wht: 10,
        dta_effective_year: null,
        notes: "Some note",
      },
    ];
    const result = await getDtaCountries();
    expect(result[0].dtaEffectiveYear).toBeUndefined();
    expect(result[0].notes).toBe("Some note");
  });
});

// ── getDaspRates ─────────────────────────────────────────────────────────

describe("getDaspRates", () => {
  it("returns static fallback when DB is empty", async () => {
    dbData = [];
    const result = await getDaspRates();
    expect(result.length).toBeGreaterThan(0);
  });

  it("maps component_type and withholding_rate to camelCase", async () => {
    dbData = [
      {
        component_type: "Employer contributions",
        withholding_rate: 35,
        notes: null,
        sort_order: 1,
      },
    ];
    const result = await getDaspRates();
    expect(result[0].componentType).toBe("Employer contributions");
    expect(result[0].withholdingRate).toBe(35);
    expect(result[0].notes).toBe("");
  });
});

// ── getWithholdingRates ──────────────────────────────────────────────────

describe("getWithholdingRates", () => {
  it("returns 8-row hardcoded fallback when DB is empty", async () => {
    dbData = [];
    const result = await getWithholdingRates();
    expect(result).toHaveLength(8);
    expect(result[0].income_type).toBe("Dividends (unfranked)");
    expect(result[0].standard_rate).toBe("30%");
  });

  it("returns DB rows as-is when data is present", async () => {
    dbData = [
      {
        id: "wh-1",
        income_type: "Dividends",
        standard_rate: "15%",
        with_dta_typical: "10%",
        notes: null,
        color: "blue",
        sort_order: 1,
      },
    ];
    const result = await getWithholdingRates();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("wh-1");
    expect(result[0].standard_rate).toBe("15%");
  });
});

// ── getPropertyRules ─────────────────────────────────────────────────────

describe("getPropertyRules", () => {
  it("returns empty array when DB is empty", async () => {
    dbData = [];
    expect(await getPropertyRules()).toEqual([]);
  });

  it("returns rules from DB", async () => {
    dbData = [
      {
        id: "pr-1",
        rule_key: "cgt_rate",
        rule_type: "rate",
        title: "CGT Rate",
        value: "25%",
        effective_from: null,
        effective_to: null,
        notes: null,
        source_url: null,
        sort_order: 1,
      },
    ];
    const result = await getPropertyRules();
    expect(result[0].rule_key).toBe("cgt_rate");
    expect(result[0].value).toBe("25%");
  });
});

// ── getPropertyRuleValue ─────────────────────────────────────────────────

describe("getPropertyRuleValue", () => {
  it("returns null when key not found (empty DB)", async () => {
    dbData = [];
    expect(await getPropertyRuleValue("nonexistent_key")).toBeNull();
  });

  it("returns value string when the key exists in DB rows", async () => {
    dbData = [
      {
        id: "pr-1",
        rule_key: "firb_fee",
        rule_type: "fee",
        title: "FIRB Fee",
        value: "$14,100",
        effective_from: null,
        effective_to: null,
        notes: null,
        source_url: null,
        sort_order: 1,
      },
    ];
    expect(await getPropertyRuleValue("firb_fee")).toBe("$14,100");
  });
});

// ── getDataCategories ────────────────────────────────────────────────────

describe("getDataCategories", () => {
  it("returns empty array when data is null", async () => {
    dbData = null;
    expect(await getDataCategories()).toEqual([]);
  });

  it("returns categories array from DB", async () => {
    dbData = [{ id: "cat-1", category_key: "tax", display_name: "Tax" }];
    const result = await getDataCategories();
    expect(result[0].category_key).toBe("tax");
  });
});

// ── getChangeLog ─────────────────────────────────────────────────────────

describe("getChangeLog", () => {
  it("returns empty array when data is null", async () => {
    dbData = null;
    expect(await getChangeLog()).toEqual([]);
  });

  it("returns change log rows from DB", async () => {
    dbData = [
      {
        id: "cl-1",
        category_key: "tax",
        action: "update",
        changed_by: "admin",
        record_id: "r1",
        previous_value: null,
        new_value: "30%",
        note: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    const result = await getChangeLog();
    expect(result[0].action).toBe("update");
    expect(result[0].changed_by).toBe("admin");
  });

  it("accepts custom limit parameter without error", async () => {
    dbData = [];
    expect(await getChangeLog(10)).toEqual([]);
  });
});

// ── getDefaultWHT ────────────────────────────────────────────────────────

describe("getDefaultWHT", () => {
  it("returns default values with dividendFullyFranked=0 when DB empty", async () => {
    dbData = [];
    const result = await getDefaultWHT();
    expect(result.dividendFullyFranked).toBe(0);
    expect(typeof result.dividendUnfranked).toBe("number");
    expect(typeof result.interest).toBe("number");
    expect(typeof result.royalties).toBe("number");
  });

  it("parses unfranked dividend and interest rates from DB rows", async () => {
    dbData = [
      {
        id: "wh-1",
        income_type: "Dividends (unfranked)",
        standard_rate: "25%",
        with_dta_typical: "15%",
        notes: null,
        color: "red",
        sort_order: 1,
      },
      {
        id: "wh-2",
        income_type: "Interest (bank deposits, bonds)",
        standard_rate: "12%",
        with_dta_typical: "10%",
        notes: null,
        color: "amber",
        sort_order: 2,
      },
    ];
    const result = await getDefaultWHT();
    expect(result.dividendUnfranked).toBe(25);
    expect(result.interest).toBe(12);
    expect(result.dividendFullyFranked).toBe(0);
    expect(result.royalties).toBeGreaterThan(0);
  });

  it("falls back to DEFAULT_WHT constants when rate string cannot be parsed", async () => {
    dbData = [
      {
        id: "wh-1",
        income_type: "Dividends (unfranked)",
        standard_rate: "N/A",
        with_dta_typical: "",
        notes: null,
        color: "red",
        sort_order: 1,
      },
    ];
    const result = await getDefaultWHT();
    // parseInt("N/A") → NaN → falls back to DEFAULT_WHT.dividendUnfranked
    expect(typeof result.dividendUnfranked).toBe("number");
    expect(Number.isFinite(result.dividendUnfranked)).toBe(true);
  });
});
