import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockRequireAdmin, mockUpsert, mockFrom } = vi.hoisted(() => {
  const upsert = vi.fn();
  return {
    mockRequireAdmin: vi.fn(),
    mockUpsert: upsert,
    mockFrom: vi.fn(() => ({ upsert })),
  };
});

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { POST } from "@/app/api/admin/afsl-register/upload/route";

const ADMIN_OK = { ok: true as const, email: "admin@invest.com.au", userId: "u1" };

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/admin/afsl-register/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN_OK);
  mockUpsert.mockResolvedValue({ error: null, count: 2 });
});

describe("POST /api/admin/afsl-register/upload", () => {
  it("rejects unauthorised callers", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: new Response("nope", { status: 401 }),
    });
    const res = await POST(makeReq({ csv: "afsl_number,licensee_name\n1,a" }));
    expect(res.status).toBe(401);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not { csv: string }", async () => {
    const res = await POST(makeReq({ wrong: "shape" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when required header columns are missing", async () => {
    const res = await POST(makeReq({ csv: "just_one_column\nvalue\n" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/afsl_number/);
  });

  it("upserts a parsed CSV with normalisation", async () => {
    const csv = [
      "afsl_number,licensee_name,status,address,effective_date,cancelled_date",
      'AFSL 123 456,Acme Wealth Pty Ltd,Current,"Level 5, 1 Pitt St, Sydney",2015-04-01,',
      "234567,Old Firm,FAKE_STATUS,,10/06/2010,30/06/2024",
    ].join("\n");

    const res = await POST(makeReq({ csv }));
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [rows, opts] = mockUpsert.mock.calls[0]!;
    expect(opts).toMatchObject({ onConflict: "afsl_number" });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      afsl_number: "123456",
      licensee_name: "Acme Wealth Pty Ltd",
      status: "current",
      address: "Level 5, 1 Pitt St, Sydney",
      effective_date: "2015-04-01",
      cancelled_date: null,
      source: "admin_csv",
    });
    // FAKE_STATUS falls back to "unknown"; AU date converts to ISO.
    expect(rows[1]).toMatchObject({
      afsl_number: "234567",
      status: "unknown",
      effective_date: "2010-06-10",
      cancelled_date: "2024-06-30",
    });
  });

  it("skips rows missing required fields and reports row-level errors", async () => {
    const csv = [
      "afsl_number,licensee_name",
      "123456,Has Name",
      ",Missing Number",
      "654321,",
    ].join("\n");
    const res = await POST(makeReq({ csv }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      rows: number;
      skipped: number;
      errors: string[];
    };
    expect(body.rows).toBe(1);
    expect(body.skipped).toBe(2);
    expect(body.errors).toHaveLength(2);
  });

  it("surfaces a 500 when the upsert fails", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "db down" }, count: null });
    const csv = "afsl_number,licensee_name\n123456,Acme\n";
    const res = await POST(makeReq({ csv }));
    expect(res.status).toBe(500);
  });
});
