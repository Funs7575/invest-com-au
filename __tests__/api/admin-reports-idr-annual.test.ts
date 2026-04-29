import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET } from "@/app/api/admin/reports/idr-annual/route";

const ADMIN_GUARD_OK = { ok: true as const, email: "admin@test.com", response: undefined };

function makeReq(search?: string): NextRequest {
  const url = search
    ? `http://localhost/api/admin/reports/idr-annual?${search}`
    : "http://localhost/api/admin/reports/idr-annual";
  return new NextRequest(url, { method: "GET" });
}

// complaints_register chain: .select().gte().lte().order() — terminal is .order()
function makeComplaintsChain(data: unknown[] = [], error: null | { message: string } = null) {
  return {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN_GUARD_OK);
  mockFrom.mockReturnValue(makeComplaintsChain());
});

describe("GET /api/admin/reports/idr-annual", () => {
  it("returns 401 when requireAdmin denies", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: false as const, response: new NextResponse(null, { status: 401 }) });
    const res = await GET(makeReq("year=2025"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an out-of-range year", async () => {
    const res = await GET(makeReq("year=1990"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid year/i);
  });

  it("returns 400 for a non-numeric year", async () => {
    const res = await GET(makeReq("year=abc"));
    expect(res.status).toBe(400);
  });

  it("returns JSON report using AFY period when no year param", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.period.label).toMatch(/AFY/);
    expect(body.totals).toHaveProperty("received");
    expect(body.totals).toHaveProperty("resolved");
    expect(body.totals).toHaveProperty("escalated_to_afca");
    expect(body.generated_by).toBe("admin@test.com");
  });

  it("uses calendar year period when year param is provided", async () => {
    const res = await GET(makeReq("year=2025"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.period.label).toMatch(/2025 \(calendar\)/);
    expect(body.period.start).toBe("2025-01-01T00:00:00Z");
    expect(body.period.end).toBe("2025-12-31T23:59:59Z");
  });

  it("returns CSV when format=csv with correct Content-Type header", async () => {
    const rows = [
      {
        id: 1,
        category: "billing",
        severity: "low",
        status: "resolved",
        submitted_at: "2025-03-01T00:00:00Z",
        resolved_at: "2025-03-05T00:00:00Z",
        escalated_at: null,
        auto_escalated_at: null,
        sla_due_at: "2025-03-30T00:00:00Z",
        reference_id: "IDR-001",
      },
    ];
    mockFrom.mockReturnValue(makeComplaintsChain(rows));
    const res = await GET(makeReq("year=2025&format=csv"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("idr-report-2025.csv");
    const text = await res.text();
    expect(text).toContain("reference_id");
    expect(text).toContain("IDR-001");
  });

  it("returns 500 when DB query fails", async () => {
    mockFrom.mockReturnValue(makeComplaintsChain([], { message: "connection refused" }));
    const res = await GET(makeReq("year=2025"));
    expect(res.status).toBe(500);
  });
});
