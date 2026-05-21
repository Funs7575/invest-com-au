import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/financial-audit", () => ({
  recordFinancialAudit: vi.fn(async () => undefined),
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

import { GET, POST, PATCH } from "@/app/api/admin/sponsored-placements/route";

function makeReq(method: string, body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/sponsored-placements", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/sponsored-placements", () => {
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

  it("GET returns rows", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.rows)).toBe(true);
  });

  // POST
  it("POST denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq("POST", { professional_id: 1, tier: "boost" }));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for missing professional_id", async () => {
    const res = await POST(makeReq("POST", { tier: "boost" }));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for invalid tier", async () => {
    const res = await POST(makeReq("POST", { professional_id: 1, tier: "platinum" }));
    expect(res.status).toBe(400);
  });

  it("POST creates placement on happy path", async () => {
    const insertBuilder = makeBuilder({ data: { id: 10 }, error: null });
    mockFrom.mockReturnValue(insertBuilder);
    const res = await POST(
      makeReq("POST", {
        professional_id: 1,
        tier: "premium",
        daily_cap_cents: 5000,
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  // PATCH
  it("PATCH denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PATCH(makeReq("PATCH", { id: 1, active: false }));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 400 for missing id", async () => {
    const res = await PATCH(makeReq("PATCH", { active: true }));
    expect(res.status).toBe(400);
  });

  it("PATCH returns 404 when placement not found", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await PATCH(makeReq("PATCH", { id: 99, active: false }));
    expect(res.status).toBe(404);
  });

  it("PATCH toggles placement active on happy path", async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { professional_id: 1 }, error: null })) // select placement
      .mockReturnValue(makeBuilder({ data: null, error: null })); // subsequent ops
    const res = await PATCH(makeReq("PATCH", { id: 5, active: false }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
