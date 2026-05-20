import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is",
    "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter", "contains",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const { mockFrom, mockIsRateLimited } = vi.hoisted(() => ({
  mockFrom: vi.fn(() => makeBuilder()),
  mockIsRateLimited: vi.fn(async () => false),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: vi.fn(() => makeBuilder()) })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mockIsRateLimited,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { POST } from "@/app/api/report-leads/route";

function makeReq(body?: unknown): NextRequest {
  if (body === undefined) {
    return new Request("http://localhost/api/report-leads", {
      method: "POST",
    }) as unknown as NextRequest;
  }
  return new Request("http://localhost/api/report-leads", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

describe("/api/report-leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    // Default: report exists, insert succeeds
    mockFrom.mockImplementation((table: string) => {
      if (table === "sector_reports") {
        return makeBuilder({ data: { slug: "test-report", report_url: "/reports/test.pdf", gated: true, status: "published" }, error: null });
      }
      if (table === "developer_leads") {
        return makeBuilder({ data: {}, error: null });
      }
      return makeBuilder();
    });
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq({ report_slug: "test", email: "a@b.com", name: "Test User" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/report-leads", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await POST(makeReq({ report_slug: "test" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeReq({ report_slug: "test", email: "not-an-email", name: "Test User" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for name too short", async () => {
    const res = await POST(makeReq({ report_slug: "test", email: "a@b.com", name: "x" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when report not found", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: null, error: null }),
    );
    const res = await POST(makeReq({ report_slug: "unknown", email: "a@b.com", name: "Test User" }));
    expect(res.status).toBe(404);
  });

  it("returns 200 with report_url on success", async () => {
    const res = await POST(makeReq({ report_slug: "test-report", email: "a@b.com", name: "Test User" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json).toHaveProperty("report_url");
  });
});
