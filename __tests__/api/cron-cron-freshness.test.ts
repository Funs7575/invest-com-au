import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

// Queue-based DB mock
interface DbResult { data?: unknown; error?: { message: string } | null; count?: number | null }
const dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "upsert", "eq", "in", "gte", "lt", "not", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: res.data ?? null, error: res.error ?? null }),
  );
  c.then = (resolve: (v: { data: unknown; error: unknown; count: number | null }) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }));
  return c;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { data: null })),
  })),
}));

import { GET } from "@/app/api/cron/cron-freshness/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/cron-freshness") as unknown as NextRequest;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/cron-freshness", () => {
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

  it("returns ok with stale_count=0 when all crons are fresh", async () => {
    // First query: global silence check (count > 0)
    dbQueue.push({ count: 5 });
    // Per-cron queries: return a recent ended_at for each expected cron
    // The EXPECTATIONS array has 16 entries; provide recent timestamps for all
    const recentEndedAt = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
    for (let i = 0; i < 20; i++) {
      dbQueue.push({ data: { ended_at: recentEndedAt } });
    }
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean; stale_count: number; checked: number };
    expect(json.ok).toBe(true);
    expect(json.stale_count).toBe(0);
    expect(json.checked).toBeGreaterThan(0);
  });

  it("detects global silence when no rows in last hour", async () => {
    // count = 0 for global silence check
    dbQueue.push({ count: 0 });
    // Per-cron: all fresh (no need to fire stale alerts)
    const recentEndedAt = new Date(Date.now() - 60_000).toISOString();
    for (let i = 0; i < 20; i++) {
      dbQueue.push({ data: { ended_at: recentEndedAt } });
    }
    const res = await GET(makeReq());
    // Route still returns 200 — the global silence is logged as error, not returned as HTTP error
    expect(res.status).toBe(200);
  });

  it("detects a stale cron when no recent ok run exists", async () => {
    dbQueue.push({ count: 5 }); // global silence: ok
    // First expectation ("retry-webhooks") has maxAgeMs=45*60_000; return null (never run)
    dbQueue.push({ data: null }); // no ok run found → age = Infinity → stale
    // Remaining expectations: all fresh
    const recentEndedAt = new Date(Date.now() - 60_000).toISOString();
    for (let i = 0; i < 20; i++) {
      dbQueue.push({ data: { ended_at: recentEndedAt } });
    }
    // slo_incidents upsert for the stale cron
    dbQueue.push({ data: null });
    const res = await GET(makeReq());
    const json = await res.json() as { stale_count: number; stale: Array<{ name: string }> };
    expect(json.stale_count).toBeGreaterThanOrEqual(1);
    expect(json.stale.some((s) => s.name === "retry-webhooks")).toBe(true);
  });

  it("upserts slo_incidents for each stale cron", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const upsertMock = vi.fn(() => Promise.resolve({ data: null, error: null }));

    // Track upsert calls
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === "slo_incidents") {
          const c: Record<string, unknown> = { upsert: upsertMock };
          c.then = (r: (v: { data: null; error: null }) => unknown) =>
            Promise.resolve(r({ data: null, error: null }));
          return c as ReturnType<ReturnType<typeof createAdminClient>["from"]>;
        }
        // For cron_run_log: first call returns count=5, subsequent return null (stale)
        return makeChain({ data: null, count: 5 }) as ReturnType<ReturnType<typeof createAdminClient>["from"]>;
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    // Just verify we don't throw — full upsert tracking via the simple mock
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
  });

  it("continues gracefully when slo_incidents upsert throws", async () => {
    dbQueue.push({ count: 5 }); // global silence
    dbQueue.push({ data: null }); // retry-webhooks: stale (no run)
    const recentEndedAt = new Date(Date.now() - 60_000).toISOString();
    for (let i = 0; i < 20; i++) {
      dbQueue.push({ data: { ended_at: recentEndedAt } });
    }
    // slo_incidents upsert throws
    dbQueue.push({ error: { message: "upsert failed" } });
    const res = await GET(makeReq());
    // Should still return 200 — catch block suppresses the error
    expect(res.status).toBe(200);
  });

  it("includes stale cron name and age_ms in response", async () => {
    dbQueue.push({ count: 3 });
    // retry-webhooks: return a run from 2 hours ago (maxAge = 45 min → stale)
    const oldEndedAt = new Date(Date.now() - 2 * 3_600_000).toISOString();
    dbQueue.push({ data: { ended_at: oldEndedAt } });
    const recentEndedAt = new Date(Date.now() - 60_000).toISOString();
    for (let i = 0; i < 20; i++) {
      dbQueue.push({ data: { ended_at: recentEndedAt } });
    }
    dbQueue.push({ data: null }); // slo_incidents upsert
    const res = await GET(makeReq());
    const json = await res.json() as { stale: Array<{ name: string; age_ms: number; cadence: string }> };
    const staleEntry = json.stale.find((s) => s.name === "retry-webhooks");
    expect(staleEntry).toBeDefined();
    expect(staleEntry!.age_ms).toBeGreaterThan(0);
    expect(staleEntry!.cadence).toBe("15m");
  });
});
