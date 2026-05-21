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

const mockGetUser = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ data: { user: { id: "u1", email: "consumer@test.com" } }, error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
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

const { mockAddToShortlist, ShortlistErrorClass } = vi.hoisted(() => {
  const mockAddToShortlist = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ id: 1 }));
  class ShortlistErrorClass extends Error {
    code: string;
    constructor(msg: string, code = "error") {
      super(msg);
      this.code = code;
    }
  }
  return { mockAddToShortlist, ShortlistErrorClass };
});

vi.mock("@/lib/brief-shortlist", () => ({
  addToShortlist: (...args: unknown[]) => mockAddToShortlist(...args),
  ShortlistError: ShortlistErrorClass,
}));

import { POST } from "@/app/api/briefs/[slug]/shortlist/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/briefs/x/shortlist", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }) as unknown as NextRequest;
}

function makeCtx(slug = "x") {
  return { params: Promise.resolve({ slug }) } as { params: Promise<{ slug: string }> };
}

const validBrief = { id: 1, contact_email: "consumer@test.com" };

const validBody = { provider_kind: "professional", provider_id: 42 };

describe("/api/briefs/[slug]/shortlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "consumer@test.com" } }, error: null });
    mockAdminFrom.mockReturnValue(makeBuilder({ data: validBrief, error: null }));
    mockAddToShortlist.mockResolvedValue({ id: 1 });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(validBody), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/briefs/x/shortlist", { method: "POST" }) as unknown as NextRequest;
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when provider_kind invalid", async () => {
    const res = await POST(makeReq({ provider_kind: "admin", provider_id: 1 }), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq(validBody), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 404 when brief not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq(validBody), makeCtx("notfound"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when user does not own brief", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u2", email: "other@test.com" } }, error: null });
    const res = await POST(makeReq(validBody), makeCtx());
    expect(res.status).toBe(403);
  });

  it("returns 200 on success", async () => {
    const res = await POST(makeReq(validBody), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 422 when shortlist limit reached", async () => {
    mockAddToShortlist.mockRejectedValue(new ShortlistErrorClass("limit", "limit_reached"));
    const res = await POST(makeReq(validBody), makeCtx());
    expect(res.status).toBe(422);
  });

  it("returns 409 when duplicate", async () => {
    mockAddToShortlist.mockRejectedValue(new ShortlistErrorClass("dup", "duplicate"));
    const res = await POST(makeReq(validBody), makeCtx());
    expect(res.status).toBe(409);
  });
});
