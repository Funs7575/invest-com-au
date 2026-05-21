import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockListRecentPeriods = vi.fn();
const mockClosePeriod = vi.fn();
vi.mock("@/lib/financial-periods", () => ({
  listRecentPeriods: (...args: unknown[]) => mockListRecentPeriods(...args),
  closePeriod: (...args: unknown[]) => mockClosePeriod(...args),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}
const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: vi.fn(() => makeBuilder()),
  })),
}));

import { GET, POST } from "@/app/api/admin/financial-periods/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/financial-periods", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/financial-periods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
    mockListRecentPeriods.mockResolvedValue([]);
    mockClosePeriod.mockResolvedValue({
      ok: true,
      period: { id: 1 },
      summary: { row_count: 10 },
    });
  });

  // GET
  it("GET denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns items when admin", async () => {
    mockListRecentPeriods.mockResolvedValue([{ id: 1, period_start: "2025-01-01" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
  });

  // POST
  it("POST denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq("POST", { period_start: "2025-01-01", period_end: "2025-01-31" }));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 when period_start or period_end missing", async () => {
    const res = await POST(makeReq("POST", { period_start: "2025-01-01" }));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 when dates not YYYY-MM-DD", async () => {
    const res = await POST(makeReq("POST", { period_start: "01/01/2025", period_end: "2025-01-31" }));
    expect(res.status).toBe(400);
  });

  it("POST closes period when valid", async () => {
    const res = await POST(
      makeReq("POST", { period_start: "2025-01-01", period_end: "2025-01-31" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST returns 500 when closePeriod fails", async () => {
    mockClosePeriod.mockResolvedValue({ ok: false, reason: "DB error" });
    const res = await POST(
      makeReq("POST", { period_start: "2025-01-01", period_end: "2025-01-31" }),
    );
    expect(res.status).toBe(500);
  });
});
