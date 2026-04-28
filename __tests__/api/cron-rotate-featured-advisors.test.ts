import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

// Three sequential from("professionals") calls per invocation:
//   [0] expire stale featured_until  → update().lt().eq()
//   [1] fetch eligible Gold advisors → select().eq().eq().is().order().limit()
//   [2] set featured_until for batch → update().in()
// Each resolves when awaited (all chains are thenable).

interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
}

const dbResults: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "update", "insert", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "gt", "is", "in", "not", "or",
    "order", "limit", "ilike",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  const r = { data: res.data ?? null, error: res.error ?? null };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbResults[dbIdx++] ?? { error: null })),
  })),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/rotate-featured-advisors/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/rotate-featured-advisors") as unknown as NextRequest;
}

const GOLD_ADVISORS = [
  { id: "a1", name: "Alice", advisor_tier: "gold", featured_until: null, last_lead_date: null },
  { id: "a2", name: "Bob",   advisor_tier: "gold", featured_until: null, last_lead_date: "2026-04-01T00:00:00Z" },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/rotate-featured-advisors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbIdx = 0;
    dbResults.length = 0;
    // Default: all three calls succeed
    dbResults.push({ error: null });                         // expire
    dbResults.push({ data: GOLD_ADVISORS, error: null });    // fetch
    dbResults.push({ error: null });                         // update
  });

  afterAll(() => { vi.restoreAllMocks(); });

  it("exports edge runtime and maxDuration=60", () => {
    expect(runtime).toBe("edge");
    expect(maxDuration).toBe(60);
  });

  it("returns 401 when requireCronAuth rejects, makes no DB calls", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response("Unauthorized", { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(dbIdx).toBe(0);
  });

  it("happy path — expires stale, fetches 2 advisors, sets featured_until for both", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.featured).toBe(2);
    expect(body.advisor_ids).toEqual(["a1", "a2"]);
    expect(body.featured_until).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // All 3 from() calls fired
    expect(dbIdx).toBe(3);
  });

  it("logs expire error but continues to fetch + update", async () => {
    dbResults[0] = { error: { message: "lock timeout" } };
    const res = await GET(makeReq());
    // Expire failure is non-fatal — fetch + update still run
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(dbIdx).toBe(3);
  });

  it("returns 500 when fetch fails, skips update", async () => {
    dbResults[1] = { data: null, error: { message: "connection refused" } };
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch advisors");
    // update (idx=2) is not called
    expect(dbIdx).toBe(2);
  });

  it("returns {success:true, featured:0} when no Gold advisors are available", async () => {
    dbResults[1] = { data: [], error: null };
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.featured).toBe(0);
    // update call is skipped when the list is empty
    expect(dbIdx).toBe(2);
  });

  it("returns 500 when the update fails", async () => {
    dbResults[2] = { error: { message: "constraint violation" } };
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to update advisors");
  });

  it("featured_until is approximately 7 days from now", async () => {
    const before = Date.now();
    const res = await GET(makeReq());
    const body = await res.json();
    const featuredTs = new Date(body.featured_until as string).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(featuredTs).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(featuredTs).toBeLessThanOrEqual(before + sevenDays + 5000);
  });
});
