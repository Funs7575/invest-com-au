import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "delete", "eq", "not", "order", "limit", "single"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

let tableResults: Record<string, unknown> = {};
const mockFrom = vi.fn((table: string) => makeBuilder(tableResults[table] ?? { data: [], error: null }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, POST, PATCH, DELETE } from "@/app/api/admin/finance/route";
import { POST as SYNC } from "@/app/api/admin/finance/sync/route";

function makeReq(method: string, body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/finance", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

const validTxn = {
  date: "2026-06-01",
  type: "expense" as const,
  category: "hosting",
  description: "Vercel Pro",
  amount_cents: 4900,
};

describe("/api/admin/finance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true, email: "admin@invest.com.au", userId: "u1" });
    tableResults = {};
  });

  it("GET denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns transactions + monthly (service-role read)", async () => {
    tableResults = {
      finance_transactions: { data: [{ id: 1, amount_cents: 100 }], error: null },
      finance_monthly_summary: { data: [{ month: "2026-06" }], error: null },
    };
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.transactions).toHaveLength(1);
    expect(json.monthly).toHaveLength(1);
  });

  it("POST rejects invalid body", async () => {
    const res = await POST(makeReq("POST", { type: "expense" }));
    expect(res.status).toBe(400);
  });

  it("POST creates a transaction", async () => {
    tableResults = { finance_transactions: { data: { id: 7, ...validTxn }, error: null } };
    const res = await POST(makeReq("POST", validTxn));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.transaction.id).toBe(7);
  });

  it("PATCH rejects body without id", async () => {
    const res = await PATCH(makeReq("PATCH", { description: "edit" }));
    expect(res.status).toBe(400);
  });

  it("PATCH updates a transaction", async () => {
    tableResults = { finance_transactions: { data: { id: 3, description: "edit" }, error: null } };
    const res = await PATCH(makeReq("PATCH", { id: 3, description: "edit" }));
    expect(res.status).toBe(200);
  });

  it("DELETE rejects missing id", async () => {
    const res = await DELETE(makeReq("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("DELETE removes a transaction", async () => {
    tableResults = { finance_transactions: { data: null, error: null } };
    const res = await DELETE(makeReq("DELETE", { id: 5 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

describe("/api/admin/finance/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true, email: "admin@invest.com.au", userId: "u1" });
    tableResults = {};
  });

  it("denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await SYNC();
    expect(res.status).toBe(401);
  });

  it("returns added:0 when no paid billing", async () => {
    tableResults = { advisor_billing: { data: [], error: null } };
    const res = await SYNC();
    const json = await res.json();
    expect(json.added).toBe(0);
  });

  it("imports only un-synced paid billing rows", async () => {
    tableResults = {
      advisor_billing: {
        data: [
          { id: 10, amount_cents: 5000, professional_id: 1, description: "lead", status: "paid", created_at: "2026-06-01T00:00:00Z" },
          { id: 11, amount_cents: 3000, professional_id: 2, description: "lead", status: "paid", created_at: "2026-06-02T00:00:00Z" },
        ],
        error: null,
      },
      // id 10 already imported → only id 11 is new.
      finance_transactions: { data: [{ reference: "advisor_billing_10" }], error: null },
    };
    const res = await SYNC();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.added).toBe(1);
  });
});
