import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/cron-groups", () => ({
  CRON_GROUPS: {
    "hourly-0": ["/api/cron/auto-resolve-disputes", "/api/cron/cron-health-alert"],
    "daily-1": ["/api/cron/cleanup"],
  },
}));

import { GET } from "@/app/api/cron/dispatch/[group]/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

function makeChain(responses: unknown[]) {
  let idx = 0;
  const chain: Record<string, unknown> = {};
  const methods = [
    "from", "select", "insert", "upsert", "update", "delete",
    "eq", "neq", "gte", "lte", "in", "order", "limit", "not", "is",
  ];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(responses[idx++] ?? { data: null, error: null }));
  chain.then = vi.fn((resolve: (v: unknown) => void) =>
    Promise.resolve(resolve(responses[idx++] ?? { data: null, error: null })),
  );
  return chain;
}

function makeSupabase(responses: unknown[]) {
  const chain = makeChain(responses);
  return { from: vi.fn(() => chain) } as never;
}

function makeReq(group: string) {
  return new NextRequest(`http://localhost/api/cron/dispatch/${group}`, {
    method: "GET",
    headers: { Authorization: "Bearer test-secret" },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  delete process.env.CRON_SECRET;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/cron/dispatch/[group]", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq("hourly-0"), {
      params: Promise.resolve({ group: "hourly-0" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown group", async () => {
    mockCreateAdmin.mockReturnValue(makeSupabase([{ error: null }]));
    const res = await GET(makeReq("unknown-group"), {
      params: Promise.resolve({ group: "unknown-group" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/unknown cron group/i);
  });

  it("dispatches to all paths in the group via loopback fetch", async () => {
    // diagnostic insert + 2×(insert running + update) = 5 supabase calls
    const chain = makeChain([
      { error: null }, // diagnostic insert
      { data: { id: "r1" }, error: null }, // path-1 insert running → single()
      { error: null }, // path-1 update
      { data: { id: "r2" }, error: null }, // path-2 insert running → single()
      { error: null }, // path-2 update
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });

    const res = await GET(makeReq("hourly-0"), {
      params: Promise.resolve({ group: "hourly-0" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.group).toBe("hourly-0");
    expect(body.total).toBe(2);
    expect(body.failed).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("uses VERCEL_PROJECT_PRODUCTION_URL as loopback origin when set", async () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "invest.com.au";
    process.env.CRON_SECRET = "s3cr3t";
    const chain = makeChain([
      { error: null },
      { data: { id: "r1" }, error: null },
      { error: null },
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });

    await GET(makeReq("daily-1"), { params: Promise.resolve({ group: "daily-1" }) });

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/^https:\/\/invest\.com\.au/);
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe("Bearer s3cr3t");
  });

  it("returns 207 when a handler returns HTTP 400+", async () => {
    const chain = makeChain([
      { error: null },
      { data: { id: "r1" }, error: null },
      { error: null },
      { data: { id: "r2" }, error: null },
      { error: null },
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ error: "oops" }) });

    const res = await GET(makeReq("hourly-0"), {
      params: Promise.resolve({ group: "hourly-0" }),
    });
    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.ok).toBe(false);
  });

  it("treats a fetch throw (network error) as failure, returns 207", async () => {
    const chain = makeChain([
      { error: null },
      { data: { id: "r1" }, error: null },
      { error: null },
      { data: { id: "r2" }, error: null },
      { error: null },
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) })
      .mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const res = await GET(makeReq("hourly-0"), {
      params: Promise.resolve({ group: "hourly-0" }),
    });
    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.failed).toBe(1);
  });

  it("handles diagnostic insert failure without aborting dispatch", async () => {
    const chain = makeChain([
      { error: { message: "DB down", code: "XX000" } }, // diagnostic insert fails
      { data: { id: "r1" }, error: null },
      { error: null },
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });

    const res = await GET(makeReq("daily-1"), {
      params: Promise.resolve({ group: "daily-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.failed).toBe(0);
  });

  it("dispatches single-path group and returns results array", async () => {
    const chain = makeChain([
      { error: null },
      { data: { id: "r1" }, error: null },
      { error: null },
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockFetch.mockResolvedValue({ ok: true, status: 204, json: () => Promise.reject(new Error("no body")) });

    const res = await GET(makeReq("daily-1"), {
      params: Promise.resolve({ group: "daily-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0]?.ok).toBe(true);
  });
});
