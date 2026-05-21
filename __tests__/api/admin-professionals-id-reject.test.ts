import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: vi.fn(async () => true),
  ipKey: vi.fn(() => "127.0.0.1"),
}));
vi.mock("@/lib/pro-onboarding-emails", () => ({
  sendProRejected: vi.fn(async () => true),
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

import { POST } from "@/app/api/admin/professionals/[id]/reject/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/professionals/42/reject", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

const validCtx = { params: Promise.resolve({ id: "42" }) } as never;

describe("POST /api/admin/professionals/[id]/reject", () => {
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
    const res = await POST(makeReq({ reason: "Incomplete docs" }), validCtx);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing reason in body", async () => {
    const res = await POST(makeReq({}), validCtx);
    expect(res.status).toBe(400);
  });

  it("returns 400 for too-short reason", async () => {
    const res = await POST(makeReq({ reason: "no" }), validCtx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when professional not found", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq({ reason: "Docs incomplete" }), validCtx);
    expect(res.status).toBe(404);
  });

  it("returns 409 when professional is already verified", async () => {
    const lookupBuilder = makeBuilder({
      data: { id: 42, email: "pro@example.com", name: "Pro", verification_status: "verified" },
      error: null,
    });
    mockFrom.mockReturnValue(lookupBuilder);
    const res = await POST(makeReq({ reason: "Docs incomplete" }), validCtx);
    expect(res.status).toBe(409);
  });

  it("returns 200 on happy path", async () => {
    const proData = {
      id: 42,
      email: "pro@example.com",
      name: "Pro Name",
      verification_status: "pending",
    };
    // First from() call = select (maybeSingle), second = update
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: proData, error: null }))
      .mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq({ reason: "Documents not clear" }), validCtx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
