import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

const mockListRecentPeriods = vi.fn();
const mockClosePeriod = vi.fn();
vi.mock("@/lib/financial-periods", () => ({
  listRecentPeriods: (...args: unknown[]) => mockListRecentPeriods(...args),
  closePeriod: (...args: unknown[]) => mockClosePeriod(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, POST } from "@/app/api/admin/financial-periods/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true, email: "admin@test.com", userId: "uid-1" } as const;
const DENY_GUARD = {
  ok: false,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
} as const;

const PERIODS = [
  { id: 1, period_start: "2026-03-01", period_end: "2026-03-31", status: "closed" },
  { id: 2, period_start: "2026-04-01", period_end: "2026-04-30", status: "open" },
];

const CLOSE_RESULT_OK = {
  ok: true,
  period: { id: 3, period_start: "2026-02-01", period_end: "2026-02-28", status: "closed" },
  summary: { rows: 42 },
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/financial-periods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupAuditMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "admin_audit_log") {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return {};
  });
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/financial-periods", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with last 24 periods", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListRecentPeriods.mockResolvedValue(PERIODS);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(mockListRecentPeriods).toHaveBeenCalledWith(24);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/admin/financial-periods", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await POST(makePost({ period_start: "2026-02-01", period_end: "2026-02-28" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when period_start is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(makePost({ period_end: "2026-02-28" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/period_start/i);
  });

  it("returns 400 when period_end is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(makePost({ period_start: "2026-02-01" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/period_end/i);
  });

  it("returns 400 when date format is invalid", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(makePost({ period_start: "01/02/2026", period_end: "2026-02-28" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/YYYY-MM-DD/i);
  });

  it("returns 200 with period and summary on success", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockClosePeriod.mockResolvedValue(CLOSE_RESULT_OK);
    setupAuditMock();
    const res = await POST(makePost({ period_start: "2026-02-01", period_end: "2026-02-28" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.period.status).toBe("closed");
    expect(body.summary.rows).toBe(42);
  });

  it("returns 200 with already_closed flag when period was already closed", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockClosePeriod.mockResolvedValue({ ok: true, reason: "already_closed", period: PERIODS[0] });
    setupAuditMock();
    const res = await POST(makePost({ period_start: "2026-02-01", period_end: "2026-02-28" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.already_closed).toBe(true);
  });

  it("returns 500 when closePeriod fails", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockClosePeriod.mockResolvedValue({ ok: false, reason: "close_failed" });
    const res = await POST(makePost({ period_start: "2026-02-01", period_end: "2026-02-28" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("close_failed");
  });

  it("passes notes to closePeriod", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockClosePeriod.mockResolvedValue(CLOSE_RESULT_OK);
    setupAuditMock();
    await POST(makePost({ period_start: "2026-02-01", period_end: "2026-02-28", notes: "Q1 audit" }));
    expect(mockClosePeriod).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "Q1 audit" })
    );
  });
});
