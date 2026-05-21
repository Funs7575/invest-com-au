import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
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

import { GET } from "@/app/api/admin/reports/idr-annual/route";

async function makeReq(search = "") {
  const { NextRequest } = await import("next/server");
  return new NextRequest(`http://localhost/api/admin/reports/idr-annual${search}`, {
    method: "GET",
  });
}

describe("GET /api/admin/reports/idr-annual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
    mockFrom.mockReturnValue(makeBuilder({ data: [], error: null }));
  });

  it("denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(await makeReq() as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid year", async () => {
    const res = await GET(await makeReq("?year=1900") as never);
    expect(res.status).toBe(400);
  });

  it("returns JSON report for valid year", async () => {
    const res = await GET(await makeReq("?year=2025") as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.totals).toBeDefined();
    expect(json.generated_by).toBe("admin@invest.com.au");
  });

  it("returns CSV when format=csv", async () => {
    const res = await GET(await makeReq("?year=2025&format=csv") as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
  });

  it("returns report for Australian financial year (no year param)", async () => {
    const res = await GET(await makeReq() as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.period.label).toContain("AFY");
  });
});
