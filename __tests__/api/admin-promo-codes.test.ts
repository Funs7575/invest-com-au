import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/briefs/promo-codes", () => ({
  listAllPromoCodes: vi.fn(async () => []),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
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

import { GET, POST, DELETE } from "@/app/api/admin/promo-codes/route";

function makeReq(method: string, body?: unknown, search = ""): NextRequest {
  return new Request(`http://localhost/api/admin/promo-codes${search}`, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/promo-codes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
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

  it("GET returns codes on happy path", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.codes)).toBe(true);
  });

  // POST
  it("POST denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq("POST", { code: "FREE10", kind: "free_brief" }));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for invalid body", async () => {
    const res = await POST(makeReq("POST", { code: "X", kind: "free_brief" }));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for percent_off_accept missing value", async () => {
    const res = await POST(
      makeReq("POST", { code: "DISC10", kind: "percent_off_accept", max_uses: 1 }),
    );
    expect(res.status).toBe(400);
  });

  it("POST mints free_brief code successfully", async () => {
    mockFrom.mockReturnValue(makeBuilder({ error: null }));
    const res = await POST(
      makeReq("POST", { code: "FREECODE", kind: "free_brief" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST returns 409 on duplicate code", async () => {
    mockFrom.mockReturnValue(makeBuilder({ error: { code: "23505", message: "unique" } }));
    const res = await POST(
      makeReq("POST", { code: "DUPE", kind: "free_brief" }),
    );
    expect(res.status).toBe(409);
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

  it("DELETE returns 400 for invalid id", async () => {
    const res = await DELETE(makeReq("DELETE", undefined, "?id=abc"));
    expect(res.status).toBe(400);
  });

  it("DELETE returns 409 if redemptions exist", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: [{ id: 1 }], error: null }));
    const res = await DELETE(makeReq("DELETE", undefined, "?id=5"));
    expect(res.status).toBe(409);
  });

  it("DELETE removes code when no redemptions", async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null })) // redemptions check
      .mockReturnValue(makeBuilder({ error: null })); // delete
    const res = await DELETE(makeReq("DELETE", undefined, "?id=5"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
