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

function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
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

import { GET, POST, DELETE } from "@/app/api/admin/competitors/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/competitors", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/competitors", () => {
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

  it("GET returns list when admin", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
  });

  // POST
  it("POST denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq("POST", {}));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 when required fields missing", async () => {
    const res = await POST(makeReq("POST", { competitor: "Canstar" }));
    expect(res.status).toBe(400);
  });

  it("POST creates entry when valid", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { id: 1, competitor: "Canstar" }, error: null }),
    );
    const res = await POST(
      makeReq("POST", {
        competitor: "Canstar",
        event_type: "pricing_change",
        title: "Canstar dropped fees",
      }),
    );
    expect(res.status).toBe(200);
  });

  // DELETE
  it("DELETE denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 400 when id missing", async () => {
    const res = await DELETE(makeReq("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("DELETE removes entry when valid", async () => {
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
  });
});
