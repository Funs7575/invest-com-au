import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
    "contains", "overlaps",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn(() => makeBuilder({ data: [{ id: 1 }], error: null }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: vi.fn(() => makeBuilder()),
  })),
}));

vi.mock("@/lib/cron-groups", () => ({
  CRON_GROUPS: {
    "test-group": ["/api/cron/test-handler"],
    "multi-group": ["/api/cron/handler-a", "/api/cron/handler-b"],
  },
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/dispatch/[group]/route";

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/dispatch/test-group", {
    headers,
  }) as unknown as NextRequest;
}

describe("GET /api/cron/dispatch/[group]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    // Mock fetch to return 200 for loopback calls
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.restoreAllMocks();
  });

  it("exports nodejs runtime and maxDuration = 300", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(300);
  });

  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }), {
      params: Promise.resolve({ group: "test-group" }),
    });
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }), {
      params: Promise.resolve({ group: "test-group" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown group", async () => {
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }), {
      params: Promise.resolve({ group: "unknown-group" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("unknown-group");
  });

  it("returns 200 for valid group with successful loopback", async () => {
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }), {
      params: Promise.resolve({ group: "test-group" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.group).toBe("test-group");
    expect(body.total).toBe(1);
    expect(body.failed).toBe(0);
  });
});
