/**
 * Tests for POST /api/admin/afsl-register/upload.
 *
 * Admin-only CSV upload that upserts rows into `public.afsl_register`.
 * Auth: requireAdmin (ADMIN_EMAILS allowlist).
 * Body: { csv: string } — parses CSV, validates columns, upserts to DB.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockRequireAdmin, mockNormaliseAfslNumber } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockNormaliseAfslNumber: vi.fn((s: string) => s.trim()),
}));

vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));

vi.mock("@/lib/afsl-register", () => ({
  normaliseAfslNumber: (s: string) => mockNormaliseAfslNumber(s),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/admin/afsl-register/upload/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADMIN_OK = { ok: true as const, email: "admin@test.com" };
const ADMIN_UNAUTH = {
  ok: false as const,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
};

const VALID_CSV =
  "afsl_number,licensee_name,status\n" +
  "123456,Acme Finance,current\n" +
  "789012,Beta Invest,cancelled";

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/afsl-register/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeUpsertBuilder(error: unknown = null, count: number | null = 2) {
  return { upsert: vi.fn().mockResolvedValue({ error, count }) };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/admin/afsl-register/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_OK);
    mockNormaliseAfslNumber.mockImplementation((s: string) => s.trim());
    mockAdminFrom.mockReturnValue(makeUpsertBuilder());
  });

  it("returns 401 when requireAdmin fails", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_UNAUTH);
    const res = await POST(makeReq({ csv: VALID_CSV }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/admin/afsl-register/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/invalid json/i);
  });

  it("returns 400 when csv field is missing", async () => {
    const res = await POST(makeReq({ notCsv: "test" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when CSV has only a header row", async () => {
    const res = await POST(makeReq({ csv: "afsl_number,licensee_name" }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/header row/i);
  });

  it("returns 400 when CSV is missing required columns", async () => {
    const res = await POST(makeReq({ csv: "name,status\nAcme,current" }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/missing required columns/i);
  });

  it("returns 400 when all rows are invalid after parsing", async () => {
    // normaliseAfslNumber returns "" → row skipped → no valid rows
    mockNormaliseAfslNumber.mockReturnValue("");
    const res = await POST(makeReq({ csv: VALID_CSV }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/no valid rows/i);
  });

  it("returns 500 when upsert fails", async () => {
    mockAdminFrom.mockReturnValue(makeUpsertBuilder({ message: "DB error" }, null));
    const res = await POST(makeReq({ csv: VALID_CSV }));
    expect(res.status).toBe(500);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/upsert failed/i);
  });

  it("returns 200 with row count on success", async () => {
    const res = await POST(makeReq({ csv: VALID_CSV }));
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; rows: number; errors: unknown[] };
    expect(data.ok).toBe(true);
    expect(data.rows).toBe(2);
    expect(Array.isArray(data.errors)).toBe(true);
  });
});
