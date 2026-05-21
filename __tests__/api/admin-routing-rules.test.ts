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

import { GET, PUT, DELETE } from "@/app/api/admin/routing-rules/route";

async function makeReq(method: string, body?: unknown, search = ""): Promise<NextRequest> {
  const { NextRequest: NR } = await import("next/server");
  return new NR(`http://localhost/api/admin/routing-rules${search}`, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

describe("/api/admin/routing-rules", () => {
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

  it("GET returns rules", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.rules)).toBe(true);
  });

  // PUT
  it("PUT denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PUT(
      await makeReq("PUT", { name: "rule one", priority: 100, match_conditions: {}, route_to: {} }),
    );
    expect(res.status).toBe(401);
  });

  it("PUT returns 400 for invalid body (name too short)", async () => {
    const res = await PUT(await makeReq("PUT", { name: "ab" }));
    expect(res.status).toBe(400);
  });

  it("PUT creates rule on happy path", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: { id: 1, name: "rule one" }, error: null }));
    const res = await PUT(
      await makeReq("PUT", {
        name: "rule one",
        priority: 50,
        match_conditions: { state: "NSW" },
        route_to: { advisor_type: "smsf" },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rule).toBeDefined();
  });

  it("PUT updates existing rule when id provided", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: { id: 3, name: "updated rule" }, error: null }));
    const res = await PUT(
      await makeReq("PUT", {
        id: 3,
        name: "updated rule",
        priority: 200,
        match_conditions: {},
        route_to: {},
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
    const res = await DELETE(await makeReq("DELETE", undefined, "?id=nope"));
    expect(res.status).toBe(400);
  });

  it("DELETE removes rule", async () => {
    const res = await DELETE(await makeReq("DELETE", undefined, "?id=7"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
