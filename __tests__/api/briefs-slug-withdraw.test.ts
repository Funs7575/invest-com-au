import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "test-ip"),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockAdminFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom, rpc: vi.fn(() => makeBuilder()) })),
}));

import { POST } from "@/app/api/briefs/[slug]/withdraw/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/briefs/x/withdraw", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }) as unknown as NextRequest;
}

function makeCtx(slug = "x") {
  return { params: Promise.resolve({ slug }) } as { params: Promise<{ slug: string }> };
}

const openBrief = {
  id: 1,
  contact_email: "consumer@test.com",
  status: "open",
};

describe("/api/briefs/[slug]/withdraw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockAdminFrom.mockReturnValue(makeBuilder({ data: openBrief, error: null }));
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ contact_email: "consumer@test.com" }), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 400 when no body", async () => {
    const req = new Request("http://localhost/api/briefs/x/withdraw", { method: "POST" }) as unknown as NextRequest;
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when contact_email missing", async () => {
    const res = await POST(makeReq({}), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when contact_email invalid format", async () => {
    const res = await POST(makeReq({ contact_email: "not-an-email" }), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when brief not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq({ contact_email: "consumer@test.com" }), makeCtx("notfound"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when email does not match", async () => {
    const res = await POST(makeReq({ contact_email: "other@test.com" }), makeCtx());
    expect(res.status).toBe(403);
  });

  it("returns 400 when brief already withdrawn", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({
      data: { ...openBrief, status: "withdrawn" },
      error: null,
    }));
    const res = await POST(makeReq({ contact_email: "consumer@test.com" }), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful withdrawal", async () => {
    const res = await POST(makeReq({ contact_email: "consumer@test.com" }), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
