import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));

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

import { GET, PUT, DELETE } from "@/app/api/admin/risk-patterns/route";

async function makeReq(method: string, body?: unknown, search = ""): Promise<NextRequest> {
  const { NextRequest: NR } = await import("next/server");
  return new NR(`http://localhost/api/admin/risk-patterns${search}`, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

describe("/api/admin/risk-patterns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
    mockFrom.mockReturnValue(makeBuilder({ data: [], error: null }));
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

  it("GET returns patterns", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.patterns)).toBe(true);
  });

  // PUT
  it("PUT denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PUT(
      await makeReq("PUT", { pattern: "fraud", category: "scam", severity: "block" }),
    );
    expect(res.status).toBe(401);
  });

  it("PUT returns 400 for invalid body", async () => {
    const res = await PUT(await makeReq("PUT", { pattern: "x" }));
    expect(res.status).toBe(400);
  });

  it("PUT creates pattern on happy path", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: { id: 1, pattern: "fraud" }, error: null }));
    const res = await PUT(
      await makeReq("PUT", { pattern: "fraudster", category: "scam-cat", severity: "block" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.pattern).toBeDefined();
  });

  it("PUT updates existing pattern when id provided", async () => {
    mockFrom.mockReturnValue(
      makeBuilder({ data: { id: 5, pattern: "updated-fraud" }, error: null }),
    );
    const res = await PUT(
      await makeReq("PUT", {
        id: 5,
        pattern: "updated-fraud",
        category: "scam-cat",
        severity: "warn",
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
    const res = await DELETE(await makeReq("DELETE", undefined, "?id=1"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 400 for invalid id", async () => {
    const res = await DELETE(await makeReq("DELETE", undefined, "?id=abc"));
    expect(res.status).toBe(400);
  });

  it("DELETE removes pattern", async () => {
    const res = await DELETE(await makeReq("DELETE", undefined, "?id=3"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
