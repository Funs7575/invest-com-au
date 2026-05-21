import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async () => ({ id: "e1", ok: true })),
}));

// Process-data-exports uses wrapCronHandler which calls createAdminClient at the
// very start (before the auth check), so admin must be mocked.
// The default result for .single() simulates "no pending rows" (PGRST116).
const noRowsResult = { data: null, error: { code: "PGRST116", message: "No rows" }, count: 0 };

function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range",
    "filter", "contains", "overlaps",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  // .maybeSingle() and .single() resolve to the result directly
  builder.single = vi.fn(() => Promise.resolve(noRowsResult));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: vi.fn(() => makeBuilder()),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ error: null })),
        createSignedUrl: vi.fn(async () => ({
          data: { signedUrl: "https://example.com/export.json" },
          error: null,
        })),
      })),
    },
    auth: {
      admin: {
        getUserById: vi.fn(async () => ({ data: { user: null }, error: null })),
      },
    },
  })),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/process-data-exports/route";

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/process-data-exports", { headers }) as unknown as NextRequest;
}

describe("GET /api/cron/process-data-exports", () => {
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

  it("returns 200 with processed=0 when no pending requests (PGRST116)", async () => {
    // Default makeBuilder returns PGRST116 on .single() — simulates no pending rows
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
  });
});
