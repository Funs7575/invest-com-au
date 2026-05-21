import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte",
    "in","is","not","or","order","limit","range","single","maybeSingle","filter",
  ]) b[m] = vi.fn(() => b);
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { POST } from "@/app/api/admin/savings-rates/import/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/savings-rates/import", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

const validRow = {
  broker_id: 1,
  product_kind: "savings_account",
  rate_pct: 5.25,
};

describe("POST /api/admin/savings-rates/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
    mockFrom.mockReturnValue(makeBuilder({ error: null }));
  });

  it("denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq({ rows: [validRow] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed JSON", async () => {
    const req = new Request("http://localhost/api/admin/savings-rates/import", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty rows array", async () => {
    const res = await POST(makeReq({ rows: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when row has intro inconsistency", async () => {
    const res = await POST(
      makeReq({
        rows: [{ ...validRow, intro_rate_pct: 6.0 }], // intro_rate_pct set but intro_term_months null
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when max_balance <= min_balance", async () => {
    const res = await POST(
      makeReq({
        rows: [{ ...validRow, min_balance: 1000, max_balance: 500 }],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("imports rows on happy path", async () => {
    const res = await POST(makeReq({ rows: [validRow] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.imported).toBe(1);
  });

  it("imports multiple rows", async () => {
    const rows = [validRow, { ...validRow, broker_id: 2 }];
    const res = await POST(makeReq({ rows }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.imported).toBe(2);
  });
});
