import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/property-suburb-refresh", () => ({
  refreshSuburb: vi.fn(async () => ({ fieldsChanged: {}, error: null })),
  selectProvider: vi.fn(() => "stub"),
}));

vi.mock("@/lib/admin/classifier-config", () => ({
  isFeatureDisabled: vi.fn(async () => false),
}));

// wrapCronHandler calls createAdminClient BEFORE auth check, so must mock.
function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range",
    "single", "maybeSingle", "filter", "contains", "overlaps",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: vi.fn(() => makeBuilder()) })),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/property-suburb-refresh/route";

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/property-suburb-refresh", { headers }) as unknown as NextRequest;
}

describe("GET /api/cron/property-suburb-refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("exports nodejs runtime and maxDuration = 300", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(300);
  });

  it("returns 500 when CRON_SECRET unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 on success with no suburbs", async () => {
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.scanned).toBe("number");
  });
});
