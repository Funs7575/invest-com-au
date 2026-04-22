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

let insertError: { message: string } | null = null;
let purgeError: { message: string } | null = null;

type InsertCall = { service: string; status: string; details: Record<string, unknown> };
const insertCalls: InsertCall[] = [];
const purgeCalls: { cutoff: string }[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table !== "health_pings") {
    throw new Error(`unexpected table: ${table}`);
  }
  return {
    insert: async (row: InsertCall) => {
      insertCalls.push(row);
      return { data: null, error: insertError };
    },
    delete: () => ({
      lt: async (_col: string, val: string) => {
        purgeCalls.push({ cutoff: val });
        return { data: null, error: purgeError };
      },
    }),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/heartbeat/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/heartbeat") as unknown as NextRequest;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("GET /api/cron/heartbeat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertError = null;
    purgeError = null;
    insertCalls.length = 0;
    purgeCalls.length = 0;
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_REGION;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("exports nodejs runtime and maxDuration = 30", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(30);
  });

  it("auth short-circuits before touching health_pings", async () => {
    const unauthResponse = new Response("Unauthorized", { status: 401 });
    vi.mocked(requireCronAuth).mockReturnValueOnce(unauthResponse as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(insertCalls).toHaveLength(0);
    expect(purgeCalls).toHaveLength(0);
  });

  it("inserts a heartbeat row and purges old rows on the happy path", async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = "abcdef1234567890";
    process.env.VERCEL_REGION = "syd1";

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.latency_ms).toEqual(expect.any(Number));
    expect(json.purged_before).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Insert carries commit + region from env (commit truncated to 7 chars)
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]?.service).toBe("cron-heartbeat");
    expect(insertCalls[0]?.status).toBe("ok");
    expect(insertCalls[0]?.details).toMatchObject({
      commit: "abcdef1",
      region: "syd1",
    });

    // Purge happened with the 7-day-old cutoff
    expect(purgeCalls).toHaveLength(1);
    expect(purgeCalls[0]?.cutoff).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("falls back to 'local' + 'unknown' in details when env vars are absent", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(insertCalls[0]?.details).toMatchObject({
      commit: "local",
      region: "unknown",
    });
  });

  it("returns 500 when the heartbeat insert fails (primary failure mode)", async () => {
    insertError = { message: "db unreachable" };

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ ok: false, error: "db unreachable" });
    // Purge is skipped when the insert fails (no point purging if DB is down)
    expect(purgeCalls).toHaveLength(0);
  });

  it("returns 200 even when the purge fails (best-effort, non-fatal)", async () => {
    purgeError = { message: "lock contention" };

    const res = await GET(makeReq());
    // The critical contract is: a failing purge must NOT fail the
    // heartbeat, because an external monitor depends on 200 to
    // know the site is alive.
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
