import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/slo", () => ({
  evaluateSlo: vi.fn(() => ({ breached: false })),
  openIncident: vi.fn(async () => {}),
  resolveIncident: vi.fn(async () => {}),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/slo-monitor/route";

const SECRET = "test-cron-secret-1234567890";
function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/slo-monitor", { headers }) as unknown as NextRequest;
}

describe("GET /api/cron/slo-monitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    // Default: no SLO definitions
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("exports config", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(120);
  });

  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 on success with no definitions", async () => {
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.evaluated).toBe(0);
  });

  it("returns 500 when slo_definitions query errors", async () => {
    // wrapCronHandler inserts into cron_run_log first (call 1), then the handler
    // queries slo_definitions (call 2). Return success for the log insert, error for the SLO query.
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        return makeBuilder({ data: null, error: { message: "DB down" } });
      }
      return makeBuilder({ data: [{ id: 1 }], error: null });
    });
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });
});
