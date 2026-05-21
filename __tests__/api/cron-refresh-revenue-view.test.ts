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

// Chainable thenable Supabase builder: every method returns the builder,
// awaiting resolves to { data: null, error: null }.
function makeBuilder() {
  const builder: Record<string, unknown> = {};
  for (const m of ["update", "gte", "lt", "eq", "not", "select", "insert", "single"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: { data: null; error: null }) => unknown) =>
    Promise.resolve(cb({ data: null, error: null }));
  return builder;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/refresh-revenue-view/route";

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/refresh-revenue-view", {
    headers,
  }) as unknown as NextRequest;
}

describe("GET /api/cron/refresh-revenue-view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    delete process.env.REVALIDATE_SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.REVALIDATE_SECRET;
  });

  it("declares edge runtime and maxDuration", () => {
    expect(runtime).toBe("edge");
    expect(maxDuration).toBe(60);
  });

  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 with a wrong bearer token", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 and updates broker affiliate priorities on success", async () => {
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.errors).toBe(0);
    expect(mockFrom).toHaveBeenCalledWith("brokers");
  });

  it("triggers ISR revalidation when REVALIDATE_SECRET is set", async () => {
    process.env.REVALIDATE_SECRET = "rsecret";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
