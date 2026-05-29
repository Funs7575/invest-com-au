import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: (..._a: unknown[]) => mockRequireAdmin(),
}));

function makeBuilder(data: unknown = [], error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/admin/affiliate-dashboard/route";

function makeReq(period?: string): NextRequest {
  const url = period
    ? `http://localhost/api/admin/affiliate-dashboard?period=${period}`
    : "http://localhost/api/admin/affiliate-dashboard";
  return new Request(url, { method: "GET" }) as unknown as NextRequest;
}

const adminOk = { ok: true, email: "admin@invest.com.au", userId: "u1" };
const adminDenied = {
  ok: false,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
};
const adminForbidden = {
  ok: false,
  response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
};

const sampleClicks = [
  { broker_slug: "broker-a", broker_name: "Broker A", created_at: "2026-05-01T00:00:00Z" },
];
const sampleSignups = [
  { id: "s1", broker_slug: "broker-a", click_id: "c1", signup_date: "2026-05-10", revenue_cents: 5000, status: "confirmed", source: "organic", external_ref: null, utm_source: null, utm_campaign: null },
];
const sampleReports = [
  { id: "r1", month: "2026-05", revenue_cents: 10000 },
];

describe("GET /api/admin/affiliate-dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(adminOk);
    // Default: all queries succeed with sample data
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return makeBuilder(sampleClicks, null);
      if (callCount === 2) return makeBuilder(sampleSignups, null);
      return makeBuilder(sampleReports, null);
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(adminDenied);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin user", async () => {
    mockRequireAdmin.mockResolvedValue(adminForbidden);
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
  });

  it("returns clicks, signups, and monthlyReports for default period (30d)", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.clicks).toHaveLength(1);
    expect(json.signups).toHaveLength(1);
    expect(json.monthlyReports).toHaveLength(1);
  });

  it("accepts period=7d without error", async () => {
    const res = await GET(makeReq("7d"));
    expect(res.status).toBe(200);
  });

  it("accepts period=30d without error", async () => {
    const res = await GET(makeReq("30d"));
    expect(res.status).toBe(200);
  });

  it("accepts period=90d without error", async () => {
    const res = await GET(makeReq("90d"));
    expect(res.status).toBe(200);
  });

  it("accepts period=all without error", async () => {
    const res = await GET(makeReq("all"));
    expect(res.status).toBe(200);
  });

  it("falls back to 30d for unrecognised period parameter", async () => {
    const res = await GET(makeReq("99y"));
    expect(res.status).toBe(200);
  });

  it("returns empty arrays when tables are empty (null data)", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.clicks).toEqual([]);
    expect(json.signups).toEqual([]);
    expect(json.monthlyReports).toEqual([]);
  });

  it("returns 500 when clicks query fails", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return makeBuilder(null, { message: "clicks error" });
      if (callCount === 2) return makeBuilder(sampleSignups, null);
      return makeBuilder(sampleReports, null);
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to load/i);
  });

  it("returns 500 when signups query fails", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return makeBuilder(sampleClicks, null);
      if (callCount === 2) return makeBuilder(null, { message: "signups error" });
      return makeBuilder(sampleReports, null);
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns 500 when monthly reports query fails", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return makeBuilder(sampleClicks, null);
      if (callCount === 2) return makeBuilder(sampleSignups, null);
      return makeBuilder(null, { message: "reports error" });
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });
});
