import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

vi.mock("@/lib/cron-groups", () => ({
  CRON_GROUPS: {
    "daily-0": ["/api/cron/heartbeat", "/api/cron/cleanup"],
    "hourly-0": ["/api/cron/cron-health-alert"],
  },
}));

// Queue of { data, error } results for supabase calls
const dbQueue: Array<{ data?: unknown; error?: { message: string } | null }> = [];
let dbIdx = 0;

function makeChain(result: { data?: unknown; error?: { message: string } | null }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "eq", "single"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(resolve({ data: result.data ?? null, error: result.error ?? null }));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { data: null, error: null })),
  })),
}));

import { GET } from "@/app/api/cron/dispatch/[group]/route";
import { requireCronAuth } from "@/lib/cron-auth";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeReq(group: string): [NextRequest, { params: Promise<{ group: string }> }] {
  const req = new Request(`http://localhost/api/cron/dispatch/${group}`) as unknown as NextRequest;
  const params = Promise.resolve({ group });
  return [req, { params }];
}

function ok200() {
  return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
}
function err500() {
  return Promise.resolve(new Response(JSON.stringify({ ok: false }), { status: 500 }));
}

beforeEach(() => {
  dbQueue.length = 0;
  dbIdx = 0;
  mockFetch.mockReset();
  vi.mocked(requireCronAuth).mockReturnValue(null);
});

describe("GET /api/cron/dispatch/[group]", () => {
  it("returns 401 when auth fails", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(null, { status: 401 }) as unknown as ReturnType<typeof requireCronAuth>,
    );
    const [req, ctx] = makeReq("daily-0");
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown group", async () => {
    // diagnostic insert
    dbQueue.push({ data: { id: 1 }, error: null });
    const [req, ctx] = makeReq("unknown-group");
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/unknown cron group/i);
  });

  it("returns 200 with ok:true when all handlers succeed", async () => {
    // diagnostic insert + 2 handlers × 2 db calls each (insert + update)
    dbQueue.push({ data: { id: 99 }, error: null }); // diagnostic
    dbQueue.push({ data: { id: 1 }, error: null });   // handler 1 insert
    dbQueue.push({ data: null, error: null });          // handler 1 update
    dbQueue.push({ data: { id: 2 }, error: null });   // handler 2 insert
    dbQueue.push({ data: null, error: null });          // handler 2 update
    mockFetch.mockResolvedValue(ok200());
    const [req, ctx] = makeReq("daily-0");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.group).toBe("daily-0");
    expect(body.total).toBe(2);
    expect(body.failed).toBe(0);
  });

  it("returns 207 when one handler returns 500", async () => {
    dbQueue.push({ data: { id: 99 }, error: null }); // diagnostic
    dbQueue.push({ data: { id: 1 }, error: null });   // handler 1 insert
    dbQueue.push({ data: null, error: null });          // handler 1 update
    dbQueue.push({ data: { id: 2 }, error: null });   // handler 2 insert
    dbQueue.push({ data: null, error: null });          // handler 2 update
    mockFetch
      .mockResolvedValueOnce(ok200())
      .mockResolvedValueOnce(err500());
    const [req, ctx] = makeReq("daily-0");
    const res = await GET(req, ctx);
    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.failed).toBe(1);
  });

  it("marks handler as failed when fetch throws (status 0)", async () => {
    dbQueue.push({ data: { id: 99 }, error: null });
    dbQueue.push({ data: { id: 1 }, error: null });
    dbQueue.push({ data: null, error: null });
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    const [req, ctx] = makeReq("hourly-0");
    const res = await GET(req, ctx);
    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.results[0].ok).toBe(false);
  });

  it("continues if diagnostic cron_run_log insert fails", async () => {
    dbQueue.push({ data: null, error: { message: "constraint" } }); // diag fails
    dbQueue.push({ data: { id: 1 }, error: null });
    dbQueue.push({ data: null, error: null });
    mockFetch.mockResolvedValue(ok200());
    const [req, ctx] = makeReq("hourly-0");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
  });

  it("includes path and timing in results", async () => {
    dbQueue.push({ data: { id: 99 }, error: null });
    dbQueue.push({ data: { id: 1 }, error: null });
    dbQueue.push({ data: null, error: null });
    mockFetch.mockResolvedValue(ok200());
    const [req, ctx] = makeReq("hourly-0");
    const res = await GET(req, ctx);
    const body = await res.json();
    expect(body.results[0].path).toBe("/api/cron/cron-health-alert");
    expect(typeof body.results[0].durationMs).toBe("number");
  });
});
