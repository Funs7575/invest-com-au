import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

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

import { GET, POST, PATCH, DELETE } from "@/app/api/admin/country-schemes/route";

function makeReq(method: string, body?: unknown, search?: string): NextRequest {
  const url = `http://localhost/api/admin/country-schemes${search ?? ""}`;
  return new NextRequest(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

const validCreateBody = {
  country_code: "GB",
  audience: "inbound_migrant",
  category: "visa_pathway",
  name: "UK Scheme",
  summary: "A summary of the scheme",
  body_md: "# Body\n\nContent here.",
  source_name: "HMRC",
  source_url: "https://hmrc.gov.uk/scheme",
  sourced_at: "2024-01-01",
  stales_at: "2025-01-01",
};

describe("/api/admin/country-schemes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: [], error: null }),
    );
  });

  // GET
  it("GET denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("GET returns rows when admin", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: [{ id: 1 }], error: null }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.rows)).toBe(true);
  });

  // POST (uses withValidatedBody)
  it("POST denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq("POST", validCreateBody));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for invalid body (missing required fields)", async () => {
    const res = await POST(makeReq("POST", { country_code: "GB" }));
    expect(res.status).toBe(400);
  });

  it("POST creates scheme with valid body", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { id: 1, ...validCreateBody }, error: null }),
    );
    const res = await POST(makeReq("POST", validCreateBody));
    expect(res.status).toBe(201);
  });

  // PATCH (uses withValidatedBody)
  it("PATCH denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PATCH(makeReq("PATCH", { id: 1, name: "Updated" }));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 400 when body missing id", async () => {
    const res = await PATCH(makeReq("PATCH", { name: "Updated" }));
    expect(res.status).toBe(400);
  });

  it("PATCH updates scheme when valid", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { id: 1, name: "Updated" }, error: null }),
    );
    const res = await PATCH(makeReq("PATCH", { id: 1, name: "Updated" }));
    expect(res.status).toBe(200);
  });

  // DELETE
  it("DELETE denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await DELETE(makeReq("DELETE", undefined, "?id=1"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 400 when no id in query", async () => {
    const res = await DELETE(makeReq("DELETE"));
    expect(res.status).toBe(400);
  });

  it("DELETE removes scheme when valid id", async () => {
    const res = await DELETE(makeReq("DELETE", undefined, "?id=1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
