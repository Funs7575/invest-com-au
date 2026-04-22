import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

// Unwrap wrapCronHandler so tests drive the handler directly.
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

// kill-switch — default OFF
let killSwitchOn = false;
vi.mock("@/lib/admin/classifier-config", () => ({
  isFeatureDisabled: vi.fn(async () => killSwitchOn),
}));

type Rule = {
  id: number;
  table_name: string;
  keep_days: number;
  timestamp_column: string;
  email_column: string | null;
  strategy: "delete" | "anonymise";
  enabled: boolean;
};

let rulesFetch: { data: Rule[] | null; error: { message: string } | null } = {
  data: [],
  error: null,
};

// Per-table result knobs so tests can simulate failures / counts
const tableBehaviour: Record<
  string,
  {
    delete: { count: number | null; error: { message: string } | null };
    update: { count: number | null; error: { message: string } | null };
  }
> = {};

function setTable(
  table: string,
  b: Partial<(typeof tableBehaviour)[string]>,
): void {
  tableBehaviour[table] = {
    delete: { count: 0, error: null },
    update: { count: 0, error: null },
    ...(tableBehaviour[table] || {}),
    ...b,
  };
}

// Capture every write for assertions
type DeleteCall = { table: string; lt: [string, string] };
type UpdateCall = {
  table: string;
  payload: Record<string, unknown>;
  lt?: [string, string];
  neq?: [string, string];
  eq?: [string, number];
};
const deleteCalls: DeleteCall[] = [];
const updateCalls: UpdateCall[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table === "retention_rules") {
    return {
      // Rules-fetch chain
      select: () => ({
        eq: async () => rulesFetch,
      }),
      // Rules-stamp chain (last_run_at + last_rows_affected)
      update: (payload: Record<string, unknown>) => ({
        eq: async (_col: string, id: number) => {
          updateCalls.push({ table, payload, eq: [_col, id] });
          return { data: null, error: null };
        },
      }),
    };
  }

  // Target table — delete or anonymise
  const beh = tableBehaviour[table] ?? {
    delete: { count: 0, error: null },
    update: { count: 0, error: null },
  };

  return {
    delete: (_opts?: unknown) => ({
      lt: async (col: string, val: string) => {
        deleteCalls.push({ table, lt: [col, val] });
        return { count: beh.delete.count, error: beh.delete.error };
      },
    }),
    update: (payload: Record<string, unknown>, _opts?: unknown) => ({
      lt: (col: string, val: string) => ({
        neq: async (neqCol: string, neqVal: string) => {
          updateCalls.push({
            table,
            payload,
            lt: [col, val],
            neq: [neqCol, neqVal],
          });
          return { count: beh.update.count, error: beh.update.error };
        },
      }),
    }),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/gdpr-retention-purge/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/gdpr-retention-purge") as unknown as NextRequest;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("GET /api/cron/gdpr-retention-purge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    killSwitchOn = false;
    rulesFetch = { data: [], error: null };
    for (const k of Object.keys(tableBehaviour)) delete tableBehaviour[k];
    deleteCalls.length = 0;
    updateCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("exports nodejs runtime and maxDuration = 300 (long-running purge)", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(300);
  });

  it("auth short-circuits before any DB read", async () => {
    const unauthResponse = new Response("Unauthorized", { status: 401 });
    vi.mocked(requireCronAuth).mockReturnValueOnce(unauthResponse as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(deleteCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(0);
  });

  it("honours the kill switch — returns skipped without touching DB", async () => {
    killSwitchOn = true;

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, skipped: "kill_switch_on" });
    expect(deleteCalls).toHaveLength(0);
  });

  it("returns 500 + fetch_failed when retention_rules read errors", async () => {
    rulesFetch = { data: null, error: { message: "db down" } };

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ ok: false, error: "fetch_failed" });
  });

  it("strategy=delete: hard-deletes old rows + stamps rule progress", async () => {
    rulesFetch = {
      data: [
        {
          id: 1,
          table_name: "analytics_events",
          keep_days: 30,
          timestamp_column: "created_at",
          email_column: null,
          strategy: "delete",
          enabled: true,
        },
      ],
      error: null,
    };
    setTable("analytics_events", { delete: { count: 123, error: null } });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, rules: 1, deleted: 123, anonymised: 0, failed: 0 });

    // Delete hit the right table / column, and with a cutoff ISO string.
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0]?.table).toBe("analytics_events");
    expect(deleteCalls[0]?.lt[0]).toBe("created_at");
    expect(deleteCalls[0]?.lt[1]).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Rule row was stamped with count + last_run_at
    const stamp = updateCalls.find(
      (c) => c.table === "retention_rules" && c.eq?.[1] === 1,
    );
    expect(stamp?.payload.last_rows_affected).toBe(123);
    expect(stamp?.payload.last_run_at).toEqual(expect.any(String));
  });

  it("strategy=anonymise: nulls email column with placeholder and stamps count", async () => {
    rulesFetch = {
      data: [
        {
          id: 2,
          table_name: "contact_submissions",
          keep_days: 365,
          timestamp_column: "submitted_at",
          email_column: "email",
          strategy: "anonymise",
          enabled: true,
        },
      ],
      error: null,
    };
    setTable("contact_submissions", { update: { count: 50, error: null } });

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, anonymised: 50, deleted: 0, failed: 0 });

    const anon = updateCalls.find(
      (c) => c.table === "contact_submissions",
    );
    expect(anon?.payload.email).toBe(
      "anonymised-2@privacy.invest.com.au",
    );
    // neq guard avoids re-anonymising the same rows on subsequent runs
    expect(anon?.neq?.[0]).toBe("email");
    expect(anon?.neq?.[1]).toBe("anonymised-2@privacy.invest.com.au");
  });

  it("skips anonymise rule that has no email_column (guard against misconfigured rule)", async () => {
    rulesFetch = {
      data: [
        {
          id: 3,
          table_name: "some_table",
          keep_days: 90,
          timestamp_column: "created_at",
          email_column: null, // ← misconfigured
          strategy: "anonymise",
          enabled: true,
        },
      ],
      error: null,
    };

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json).toMatchObject({ anonymised: 0, deleted: 0, failed: 0 });
    expect(updateCalls).toHaveLength(0);
  });

  it("one broken rule doesn't stop the rest — failure count increments, other rules still run", async () => {
    rulesFetch = {
      data: [
        {
          id: 10,
          table_name: "broken_table",
          keep_days: 30,
          timestamp_column: "created_at",
          email_column: null,
          strategy: "delete",
          enabled: true,
        },
        {
          id: 11,
          table_name: "ok_table",
          keep_days: 60,
          timestamp_column: "created_at",
          email_column: null,
          strategy: "delete",
          enabled: true,
        },
      ],
      error: null,
    };
    setTable("broken_table", {
      delete: { count: null, error: { message: "fk constraint" } },
    });
    setTable("ok_table", { delete: { count: 7, error: null } });

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json).toMatchObject({ rules: 2, deleted: 7, failed: 1 });
  });
});
