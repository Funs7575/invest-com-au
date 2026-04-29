import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

// Queue-based DB mock: each call to supabase.from() consumes the next result.
interface DbResult { data?: unknown; error?: { message: string } | null }
const dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "delete", "eq", "in", "lt", "order", "limit", "not"]) {
    c[m] = vi.fn(() => c);
  }
  // Make it thenable so `await supabase.from(...).select()...` resolves
  c.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  return c;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { data: null })),
  })),
}));

import { GET } from "@/app/api/cron/observability-retention/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/observability-retention") as unknown as NextRequest;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/observability-retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbQueue.length = 0;
    dbIdx = 0;
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok with zero counts when no old rows", async () => {
    dbQueue.push({ data: [] }); // cron_run_log select
    dbQueue.push({ data: [] }); // cron_health_alerts select
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean; cron_run_log_deleted: number; cron_health_alerts_deleted: number };
    expect(json.ok).toBe(true);
    expect(json.cron_run_log_deleted).toBe(0);
    expect(json.cron_health_alerts_deleted).toBe(0);
  });

  it("deletes old cron_run_log rows and reports count", async () => {
    dbQueue.push({ data: [{ id: 1 }, { id: 2 }] }); // cron_run_log select
    dbQueue.push({ data: null, error: null });         // cron_run_log delete
    dbQueue.push({ data: [] });                        // cron_health_alerts select
    const res = await GET(makeReq());
    const json = await res.json() as { cron_run_log_deleted: number };
    expect(json.cron_run_log_deleted).toBe(2);
  });

  it("deletes old cron_health_alerts rows and reports count", async () => {
    dbQueue.push({ data: [] });                         // cron_run_log select (no rows)
    dbQueue.push({ data: [{ id: 10 }, { id: 11 }, { id: 12 }] }); // cron_health_alerts select
    dbQueue.push({ data: null, error: null });           // cron_health_alerts delete
    const res = await GET(makeReq());
    const json = await res.json() as { cron_health_alerts_deleted: number };
    expect(json.cron_health_alerts_deleted).toBe(3);
  });

  it("does not increment cron_run_log_deleted when delete errors", async () => {
    dbQueue.push({ data: [{ id: 1 }] });                // cron_run_log select
    dbQueue.push({ error: { message: "delete failed" } }); // cron_run_log delete error
    dbQueue.push({ data: [] });                          // cron_health_alerts select
    const res = await GET(makeReq());
    const json = await res.json() as { cron_run_log_deleted: number; ok: boolean };
    expect(json.ok).toBe(true);
    expect(json.cron_run_log_deleted).toBe(0);
  });

  it("continues to cron_health_alerts even when cron_run_log throws", async () => {
    // Simulate exception: dbQueue empty for first from() call
    // We manipulate makeChain to throw by re-mocking createAdminClient
    const { createAdminClient } = await import("@/lib/supabase/admin");
    let callCount = 0;
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          const c: Record<string, unknown> = {};
          for (const m of ["select", "lt", "limit"]) c[m] = vi.fn(() => c);
          c.then = (_resolve: unknown, reject: (e: Error) => unknown) =>
            Promise.reject(new Error("network error")).catch(reject);
          return c as ReturnType<ReturnType<typeof createAdminClient>["from"]>;
        }
        return makeChain({ data: [] }) as ReturnType<ReturnType<typeof createAdminClient>["from"]>;
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const res = await GET(makeReq());
    // Should still return 200 — exception is caught internally
    expect(res.status).toBe(200);
  });

  it("reports both delete counts in the same response", async () => {
    dbQueue.push({ data: [{ id: 1 }] }); // cron_run_log select
    dbQueue.push({ data: null, error: null }); // cron_run_log delete
    dbQueue.push({ data: [{ id: 2 }, { id: 3 }] }); // cron_health_alerts select
    dbQueue.push({ data: null, error: null }); // cron_health_alerts delete
    const res = await GET(makeReq());
    const json = await res.json() as { cron_run_log_deleted: number; cron_health_alerts_deleted: number };
    expect(json.cron_run_log_deleted).toBe(1);
    expect(json.cron_health_alerts_deleted).toBe(2);
  });
});
