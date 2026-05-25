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

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

let killSwitchOn = false;
vi.mock("@/lib/admin/classifier-config", () => ({
  isFeatureDisabled: vi.fn(async () => killSwitchOn),
}));

// Use the real SOFT_DELETE_ENTITY_TABLES list so the cron iterates the same
// 5 tables it would in production.
vi.mock("@/lib/gdpr-soft-delete", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gdpr-soft-delete")>();
  return { SOFT_DELETE_ENTITY_TABLES: actual.SOFT_DELETE_ENTITY_TABLES };
});

// Per-table select + delete behaviour.
const selectBehaviour: Record<
  string,
  { data: { id: number }[] | null; error: { message: string } | null }
> = {};
const deleteBehaviour: Record<
  string,
  { count: number | null; error: { message: string } | null }
> = {};
const deleteCalls: { table: string; ids: (string | number)[] }[] = [];

const mockFrom = vi.fn((table: string) => ({
  select: () => ({
    not: () => ({
      lt: () => ({
        limit: async () => selectBehaviour[table] ?? { data: [], error: null },
      }),
    }),
  }),
  delete: (_opts?: unknown) => ({
    in: async (_col: string, ids: (string | number)[]) => {
      deleteCalls.push({ table, ids });
      return deleteBehaviour[table] ?? { count: 0, error: null };
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/hard-delete-expired/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/hard-delete-expired") as unknown as NextRequest;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("GET /api/cron/hard-delete-expired", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    killSwitchOn = false;
    for (const k of Object.keys(selectBehaviour)) delete selectBehaviour[k];
    for (const k of Object.keys(deleteBehaviour)) delete deleteBehaviour[k];
    deleteCalls.length = 0;
  });

  afterAll(() => vi.restoreAllMocks());

  it("exports nodejs runtime and maxDuration = 300", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(300);
  });

  it("auth short-circuits before any DB read", async () => {
    const unauth = new Response("Unauthorized", { status: 401 });
    vi.mocked(requireCronAuth).mockReturnValueOnce(unauth as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(deleteCalls).toHaveLength(0);
  });

  it("honours the kill switch", async () => {
    killSwitchOn = true;
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json).toEqual({ ok: true, skipped: "kill_switch_on" });
    expect(deleteCalls).toHaveLength(0);
  });

  it("no expired rows → scanned 0, deleted 0, no delete issued", async () => {
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, scanned: 0, deleted: 0, failed: 0 });
    expect(deleteCalls).toHaveLength(0);
  });

  it("deletes expired redacted rows on a table", async () => {
    selectBehaviour.professionals = { data: [{ id: 1 }, { id: 2 }], error: null };
    deleteBehaviour.professionals = { count: 2, error: null };

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, deleted: 2 });
    expect(json.scanned).toBeGreaterThanOrEqual(2);

    const proDelete = deleteCalls.find((c) => c.table === "professionals");
    expect(proDelete?.ids).toEqual([1, 2]);
  });

  it("one failing table increments failed but does not stop the rest", async () => {
    selectBehaviour.professionals = { data: null, error: { message: "select boom" } };
    selectBehaviour.investor_profiles = { data: [{ id: 5 }], error: null };
    deleteBehaviour.investor_profiles = { count: 1, error: null };

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json).toMatchObject({ ok: false, failed: 1, deleted: 1 });
  });
});
