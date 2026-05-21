import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));

vi.mock("@/lib/tmds", () => ({
  listAllTmds: vi.fn(async () => []),
  upsertTmd: vi.fn(async () => ({ ok: true, id: 42 })),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
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

import { GET, POST } from "@/app/api/admin/tmds/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/tmds", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

const validBody = {
  product_type: "broker",
  product_ref: "commsec",
  product_name: "CommSec Pocket",
  tmd_url: "https://example.com/tmd.pdf",
  tmd_version: "2025-01",
};

describe("/api/admin/tmds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
    mockFrom.mockReturnValue(makeBuilder({ error: null }));
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

  it("GET returns items", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.items)).toBe(true);
  });

  // POST
  it("POST denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 when required field missing", async () => {
    const { product_type: _pt, ...partial } = validBody;
    const res = await POST(makeReq(partial));
    expect(res.status).toBe(400);
  });

  it("POST upserts TMD on happy path", async () => {
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.id).toBe(42);
  });

  it("POST returns 400 when upsertTmd returns error", async () => {
    const { upsertTmd } = await import("@/lib/tmds");
    vi.mocked(upsertTmd).mockResolvedValueOnce({ ok: false, error: "Duplicate TMD version" });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Duplicate TMD version");
  });
});
