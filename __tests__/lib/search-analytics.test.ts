import { describe, it, expect, beforeEach, vi } from "vitest";

interface Row {
  id: number;
  query_text: string;
  surface: string;
  query_length: number;
  result_count: number | null;
  result_clicked: boolean;
  clicked_rank: number | null;
  session_hash: string | null;
  created_at: string;
}

let rows: Row[] = [];
let nextId = 1;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const builder = (table: string) => {
      const state: {
        op: "select" | "insert";
        filters: Record<string, unknown>;
        gteFilters: Record<string, string>;
        limitN?: number;
      } = { op: "select", filters: {}, gteFilters: {} };
      const api: Record<string, unknown> = {};
      api.select = () => api;
      api.insert = (payload: Row) => {
        if (table === "search_queries") {
          rows.push({
            id: nextId++,
            query_text: payload.query_text,
            query_length: payload.query_length,
            surface: payload.surface,
            result_count: payload.result_count ?? null,
            result_clicked: payload.result_clicked ?? false,
            clicked_rank: payload.clicked_rank ?? null,
            session_hash: payload.session_hash ?? null,
            created_at: new Date().toISOString(),
          });
        }
        return Promise.resolve({ error: null });
      };
      api.eq = (col: string, val: unknown) => {
        state.filters[col] = val;
        return api;
      };
      api.gte = (col: string, val: string) => {
        state.gteFilters[col] = val;
        return api;
      };
      api.limit = (n: number) => {
        state.limitN = n;
        return api;
      };
      (api as Record<string, unknown>).then = (
        resolve: (v: unknown) => void,
      ) => {
        resolve(run());
      };

      function run() {
        if (table !== "search_queries") {
          return Promise.resolve({ data: [], error: null });
        }
        let matched = rows.filter((r) => {
          for (const [k, v] of Object.entries(state.filters)) {
            if ((r as unknown as Record<string, unknown>)[k] !== v) return false;
          }
          for (const [k, min] of Object.entries(state.gteFilters)) {
            if (String((r as unknown as Record<string, unknown>)[k]) < min)
              return false;
          }
          return true;
        });
        if (state.limitN != null) matched = matched.slice(0, state.limitN);
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
  redactQuery,
  isValidSurface,
  logSearchQuery,
  topQueries,
  zeroResultQueries,
} from "@/lib/search-analytics";

beforeEach(() => {
  rows = [];
  nextId = 1;
});

describe("redactQuery", () => {
  it("lowercases and trims", () => {
    expect(redactQuery("  HELLO World  ")).toBe("hello world");
  });

  it("redacts an email address", () => {
    expect(redactQuery("alice@example.com looking for advice")).toContain(
      "[email]",
    );
  });

  it("redacts an AU mobile number", () => {
    expect(redactQuery("call me on 0412345678")).toContain("[phone]");
  });

  it("redacts an international AU mobile", () => {
    expect(redactQuery("+61 4 1234 5678 please")).toContain("[phone]");
  });

  it("redacts a 9-digit TFN with spaces", () => {
    expect(redactQuery("my tfn is 123 456 789")).toContain("[tfn]");
  });

  it("redacts a 16-digit card number", () => {
    expect(redactQuery("4111111111111111 card info")).toContain("[card]");
  });

  it("leaves ordinary text untouched", () => {
    expect(redactQuery("best etf for smsf")).toBe("best etf for smsf");
  });

  it("collapses whitespace", () => {
    expect(redactQuery("best    etf    for   smsf")).toBe("best etf for smsf");
  });
});

describe("isValidSurface", () => {
  it("accepts the known surfaces", () => {
    for (const s of [
      "articles",
      "advisors",
      "compare",
      "best_for",
      "topic",
      "tag",
      "quiz",
      "global",
    ]) {
      expect(isValidSurface(s)).toBe(true);
    }
  });

  it("rejects unknown surfaces", () => {
    expect(isValidSurface("other")).toBe(false);
    expect(isValidSurface(null)).toBe(false);
    expect(isValidSurface(123)).toBe(false);
  });
});

describe("logSearchQuery", () => {
  it("refuses empty or too-short queries", async () => {
    expect(
      await logSearchQuery({ queryText: "", surface: "articles" }),
    ).toBe(false);
    expect(
      await logSearchQuery({ queryText: " ", surface: "articles" }),
    ).toBe(false);
  });

  it("refuses invalid surfaces", async () => {
    const ok = await logSearchQuery({
      queryText: "best etf",
      // @ts-expect-error runtime validation
      surface: "nope",
    });
    expect(ok).toBe(false);
  });

  it("writes a row on a valid call", async () => {
    const ok = await logSearchQuery({
      queryText: "best etf for smsf",
      surface: "articles",
      resultCount: 5,
    });
    expect(ok).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0].query_text).toBe("best etf for smsf");
    expect(rows[0].query_length).toBe("best etf for smsf".length);
  });

  it("redacts PII before writing", async () => {
    await logSearchQuery({
      queryText: "help me at alice@example.com",
      surface: "articles",
    });
    expect(rows[0].query_text).toContain("[email]");
    expect(rows[0].query_text).not.toContain("alice@example.com");
  });

  it("truncates monster queries at 200 chars", async () => {
    const huge = "x".repeat(1000);
    await logSearchQuery({ queryText: huge, surface: "articles" });
    expect(rows[0].query_text.length).toBe(200);
  });
});

describe("topQueries", () => {
  beforeEach(() => {
    rows = [
      {
        id: 1,
        query_text: "best etf",
        query_length: 8,
        surface: "articles",
        result_count: 5,
        result_clicked: true,
        clicked_rank: 1,
        session_hash: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        query_text: "best etf",
        query_length: 8,
        surface: "articles",
        result_count: 5,
        result_clicked: false,
        clicked_rank: null,
        session_hash: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 3,
        query_text: "smsf advisor",
        query_length: 12,
        surface: "articles",
        result_count: 2,
        result_clicked: true,
        clicked_rank: 1,
        session_hash: null,
        created_at: new Date().toISOString(),
      },
    ];
  });

  it("groups by query_text and sorts by count desc", async () => {
    const out = await topQueries({ daysBack: 30 });
    expect(out[0].query_text).toBe("best etf");
    expect(out[0].count).toBe(2);
    expect(out[1].query_text).toBe("smsf advisor");
  });

  it("computes click_rate", async () => {
    const out = await topQueries({ daysBack: 30 });
    const bestEtf = out.find((r) => r.query_text === "best etf");
    expect(bestEtf?.click_rate).toBe(0.5);
  });

  it("respects limit", async () => {
    const out = await topQueries({ daysBack: 30, limit: 1 });
    expect(out).toHaveLength(1);
  });
});

describe("zeroResultQueries", () => {
  it("returns only rows where result_count is 0", async () => {
    rows = [
      {
        id: 1,
        query_text: "unknown topic",
        query_length: 13,
        surface: "articles",
        result_count: 0,
        result_clicked: false,
        clicked_rank: null,
        session_hash: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        query_text: "best etf",
        query_length: 8,
        surface: "articles",
        result_count: 5,
        result_clicked: true,
        clicked_rank: 1,
        session_hash: null,
        created_at: new Date().toISOString(),
      },
    ];
    const out = await zeroResultQueries({ daysBack: 30 });
    expect(out).toHaveLength(1);
    expect(out[0].query_text).toBe("unknown topic");
  });
});
