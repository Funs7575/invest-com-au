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

function makeBuilder(result: unknown = { data: [], error: null }) {
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

import { GET, POST } from "@/app/api/admin/fee-queue/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/fee-queue", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/fee-queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
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
    const res = await GET();
    expect(res.status).toBe(200);
  });

  // POST
  it("POST denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq("POST", { id: 1, action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 when id or action missing", async () => {
    const res = await POST(makeReq("POST", { id: 1 }));
    expect(res.status).toBe(400);
  });

  it("POST returns 404 when item not found", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq("POST", { id: 99, action: "approve" }));
    expect(res.status).toBe(404);
  });

  it("POST approves fee change when item found", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({
        data: {
          id: 1,
          broker_id: 10,
          field_name: "asx_fee",
          old_value: "$9.50",
          new_value: "$8.00",
        },
        error: null,
      }),
    );
    const res = await POST(makeReq("POST", { id: 1, action: "approve" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("approved");
  });

  it("POST rejects fee change when item found", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({
        data: {
          id: 1,
          broker_id: 10,
          field_name: "asx_fee",
          old_value: "$9.50",
          new_value: "$8.00",
        },
        error: null,
      }),
    );
    const res = await POST(makeReq("POST", { id: 1, action: "reject" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("rejected");
  });

  it("POST returns 400 for invalid action", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({
        data: { id: 1, broker_id: 10, field_name: "asx_fee", old_value: "$9.50", new_value: "$8.00" },
        error: null,
      }),
    );
    const res = await POST(makeReq("POST", { id: 1, action: "zap" }));
    expect(res.status).toBe(400);
  });
});
