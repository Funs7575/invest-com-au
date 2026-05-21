import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

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

import { GET } from "@/app/api/admin/reports/afsl-monthly/route";

async function makeReq(search = ""): Promise<Request> {
  const { NextRequest } = await import("next/server");
  return new NextRequest(`http://localhost/api/admin/reports/afsl-monthly${search}`, {
    method: "GET",
  });
}

describe("GET /api/admin/reports/afsl-monthly", () => {
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

  it("returns report JSON on happy path with default month", async () => {
    const res = await GET(await makeReq() as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.report_type).toBe("afsl_monthly");
    expect(json.generated_by).toBe("admin@invest.com.au");
    expect(json.financial_audit).toBeDefined();
  });

  it("returns report for explicit month param", async () => {
    const res = await GET(await makeReq("?month=2025-01") as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.month_label).toBe("2025-01");
  });

  it("includes Content-Disposition header", async () => {
    const res = await GET(await makeReq("?month=2025-03") as never);
    expect(res.headers.get("Content-Disposition")).toContain("afsl-monthly-2025-03.json");
  });
});
