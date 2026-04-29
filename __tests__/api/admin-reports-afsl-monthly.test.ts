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

import { GET } from "@/app/api/admin/reports/afsl-monthly/route";

const ADMIN_GUARD_OK = { ok: true as const, email: "admin@test.com", response: undefined };

function makeReq(month?: string): NextRequest {
  const url = month
    ? `http://localhost/api/admin/reports/afsl-monthly?month=${month}`
    : "http://localhost/api/admin/reports/afsl-monthly";
  return new NextRequest(url, { method: "GET" });
}

// All 8 parallel queries end with .lt() as the terminal call
function makeEmptyChain() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN_GUARD_OK);
  mockFrom.mockReturnValue(makeEmptyChain());
});

describe("GET /api/admin/reports/afsl-monthly", () => {
  it("returns 401 when requireAdmin denies", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: false as const, response: new NextResponse(null, { status: 401 }) });
    const res = await GET(makeReq("2026-03"));
    expect(res.status).toBe(401);
  });

  it("returns JSON report with expected shape for given month", async () => {
    const res = await GET(makeReq("2026-03"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.report_type).toBe("afsl_monthly");
    expect(body.month_label).toBe("2026-03");
    expect(body.period).toHaveProperty("start");
    expect(body.period).toHaveProperty("end");
    expect(body.financial_audit).toBeDefined();
    expect(body.advisor_verification).toBeDefined();
    expect(body.photo_moderation).toBeDefined();
    expect(body.text_moderation).toBeDefined();
    expect(body.lead_disputes).toBeDefined();
    expect(body.slo_incidents).toBeDefined();
    expect(body.generated_by).toBe("admin@test.com");
  });

  it("sets Content-Disposition attachment header with filename", async () => {
    const res = await GET(makeReq("2026-03"));
    const disposition = res.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("afsl-monthly-2026-03.json");
  });

  it("defaults to previous month when no month param given", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.month_label).toMatch(/^\d{4}-\d{2}$/);
  });

  it("aggregates refund rows and computes total_refunded_cents correctly", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) {
        // financial_audit_log — first query in Promise.all
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockResolvedValue({
            data: [
              { action: "refund", amount_cents: 500, reason: "duplicate" },
              { action: "refund", amount_cents: 300, reason: "error" },
              { action: "credit", amount_cents: 100, reason: null },
            ],
            error: null,
          }),
        };
      }
      return makeEmptyChain();
    });
    const res = await GET(makeReq("2026-03"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.financial_audit.total_refunded_cents).toBe(800);
    expect(body.financial_audit.total_refunded_aud).toBe("8.00");
    expect(body.financial_audit.by_action).toMatchObject({ refund: 2, credit: 1 });
  });
});
