import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
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

vi.mock("@/lib/email-templates", () => ({
  weeklyDigestEmail: vi.fn(() => "<html>digest</html>"),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/weekly-newsletter/route";

const SECRET = "test-cron-secret-1234567890";
function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/weekly-newsletter", { headers }) as unknown as NextRequest;
}

describe("GET /api/cron/weekly-newsletter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    process.env.RESEND_API_KEY = "test-resend-key";
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
  });

  it("exports config", () => {
    expect(runtime).toBe("edge");
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

  it("returns 500 when RESEND_API_KEY is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 200 with sent:0 when no subscribers", async () => {
    // All supabase queries return empty — no subscribers
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Either "No subscribers" message or sent:0
    expect(body.sent).toBe(0);
  });
});
