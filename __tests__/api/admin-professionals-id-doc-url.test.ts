import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
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
const mockCreateSignedUrl = vi.fn(async () => ({
  data: { signedUrl: "https://storage.example.com/signed-doc" },
  error: null,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: vi.fn(() => ({ createSignedUrl: mockCreateSignedUrl })) },
  })),
}));

import { GET } from "@/app/api/admin/professionals/[id]/doc-url/route";

function makeReq(id = "42"): NextRequest {
  return new Request(`http://localhost/api/admin/professionals/${id}/doc-url`, {
    method: "GET",
  }) as unknown as NextRequest;
}

describe("GET /api/admin/professionals/[id]/doc-url", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
  });

  it("denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(makeReq(), { params: Promise.resolve({ id: "42" }) } as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric id", async () => {
    const res = await GET(makeReq("abc"), { params: Promise.resolve({ id: "abc" }) } as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 for zero id", async () => {
    const res = await GET(makeReq("0"), { params: Promise.resolve({ id: "0" }) } as never);
    expect(res.status).toBe(400);
  });

  it("returns 404 when no doc on file", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await GET(makeReq("42"), { params: Promise.resolve({ id: "42" }) } as never);
    expect(res.status).toBe(404);
  });

  it("returns signed_url on happy path", async () => {
    const builder = makeBuilder({
      data: { verification_doc_url: "docs/pro42.pdf" },
      error: null,
    });
    mockFrom.mockReturnValue(builder);
    const res = await GET(makeReq("42"), { params: Promise.resolve({ id: "42" }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.signed_url).toBe("https://storage.example.com/signed-doc");
    expect(json.expires_in_seconds).toBe(300);
  });
});
