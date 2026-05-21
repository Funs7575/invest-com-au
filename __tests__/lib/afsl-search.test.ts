import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The query builder is chainable and thenable, so a single object that returns
 * itself from every method and resolves to a per-table fixture covers both the
 * `afsl_register` search and the `professionals` cross-link query.
 */
const { state, mockFrom } = vi.hoisted(() => {
  const state: {
    afsl: { data: unknown; error: unknown };
    professionals: { data: unknown; error: unknown };
    lastTable: string | null;
    calls: Record<string, unknown[]>;
  } = {
    afsl: { data: [], error: null },
    professionals: { data: [], error: null },
    lastTable: null,
    calls: {},
  };

  function makeBuilder(table: string) {
    const result = table === "professionals" ? state.professionals : state.afsl;
    const builder: Record<string, unknown> = {};
    const chain = (name: string) =>
      (...args: unknown[]) => {
        state.calls[`${table}.${name}`] = args;
        return builder;
      };
    builder.select = chain("select");
    builder.ilike = chain("ilike");
    builder.eq = chain("eq");
    builder.in = chain("in");
    builder.order = chain("order");
    // `limit` and `in` are the terminal awaited calls — make the builder a thenable.
    builder.limit = chain("limit");
    builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
    return builder;
  }

  return {
    state,
    mockFrom: vi.fn((table: string) => {
      state.lastTable = table;
      return makeBuilder(table);
    }),
  };
});

vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: () => ({ from: mockFrom }),
}));

import {
  searchAfslRegister,
  summariseConditions,
  AFSL_SEARCH_MAX_RESULTS,
} from "@/lib/afsl-search";

beforeEach(() => {
  vi.clearAllMocks();
  state.afsl = { data: [], error: null };
  state.professionals = { data: [], error: null };
  state.calls = {};
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
});

describe("summariseConditions", () => {
  it("returns null for null/empty", () => {
    expect(summariseConditions(null)).toBeNull();
    expect(summariseConditions("")).toBeNull();
    expect(summariseConditions("   ")).toBeNull();
  });
  it("handles a plain string", () => {
    expect(summariseConditions("Retail clients only")).toBe(
      "Retail clients only",
    );
  });
  it("joins an array of strings", () => {
    expect(summariseConditions(["A", "B"])).toBe("A; B");
  });
  it("reads {summary} and {items}", () => {
    expect(summariseConditions({ summary: "Wholesale only" })).toBe(
      "Wholesale only",
    );
    expect(summariseConditions({ items: ["X", "Y"] })).toBe("X; Y");
  });
  it("ignores unexpected shapes without throwing", () => {
    expect(summariseConditions(42)).toBeNull();
    expect(summariseConditions({ foo: "bar" })).toBeNull();
  });
});

describe("searchAfslRegister", () => {
  it("returns [] for a too-short query without querying", async () => {
    expect(await searchAfslRegister("a")).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("name search uses ilike on licensee_name", async () => {
    state.afsl = {
      data: [
        {
          afsl_number: "240145",
          licensee_name: "Acme Wealth",
          status: "current",
          licence_conditions: "Retail clients only",
          last_verified_at: "2026-05-18T00:00:00Z",
        },
      ],
      error: null,
    };
    const results = await searchAfslRegister("acme");
    expect(mockFrom).toHaveBeenCalledWith("afsl_register");
    expect(state.calls["afsl_register.ilike"]).toEqual([
      "licensee_name",
      "%acme%",
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]?.conditions_summary).toBe("Retail clients only");
    expect(results[0]?.advisor_slug).toBeNull();
  });

  it("pure-number query uses ilike prefix on afsl_number", async () => {
    state.afsl = { data: [], error: null };
    await searchAfslRegister("2401");
    expect(state.calls["afsl_register.ilike"]).toEqual(["afsl_number", "2401%"]);
  });

  it("'AFSL 240 145' is treated as a number search", async () => {
    state.afsl = { data: [], error: null };
    await searchAfslRegister("AFSL 240 145");
    expect(state.calls["afsl_register.ilike"]).toEqual([
      "afsl_number",
      "240145%",
    ]);
  });

  it("a name containing a short number stays a name search", async () => {
    state.afsl = { data: [], error: null };
    await searchAfslRegister("Smith 360 Wealth");
    expect(state.calls["afsl_register.ilike"]?.[0]).toBe("licensee_name");
  });

  it("attaches the advisor cross-link when a profile matches", async () => {
    state.afsl = {
      data: [
        {
          afsl_number: "240145",
          licensee_name: "Acme Wealth",
          status: "current",
          licence_conditions: null,
          last_verified_at: "2026-05-18T00:00:00Z",
        },
      ],
      error: null,
    };
    state.professionals = {
      data: [{ slug: "acme-wealth", name: "Acme Wealth", afsl_number: "240145" }],
      error: null,
    };
    const results = await searchAfslRegister("acme");
    expect(results[0]?.advisor_slug).toBe("acme-wealth");
    expect(results[0]?.advisor_name).toBe("Acme Wealth");
    // cross-link query is scoped to active advisors only
    expect(state.calls["professionals.eq"]).toEqual(["status", "active"]);
  });

  it("returns [] on DB error (no throw)", async () => {
    state.afsl = { data: null, error: { message: "boom" } };
    expect(await searchAfslRegister("acme")).toEqual([]);
  });

  it("strips PostgREST-special characters from the term", async () => {
    state.afsl = { data: [], error: null };
    await searchAfslRegister("Smith, Jones & Co (Pty)");
    expect(state.calls["afsl_register.ilike"]).toEqual([
      "licensee_name",
      "%Smith Jones Co Pty%",
    ]);
  });

  it("caps the query at AFSL_SEARCH_MAX_RESULTS", async () => {
    state.afsl = { data: [], error: null };
    await searchAfslRegister("acme");
    expect(state.calls["afsl_register.limit"]).toEqual([AFSL_SEARCH_MAX_RESULTS]);
  });
});
