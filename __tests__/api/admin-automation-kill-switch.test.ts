import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));
vi.mock("@/lib/admin/classifier-config", () => ({
  invalidateClassifierConfigCache: vi.fn(),
  invalidateKillSwitchCache: vi.fn(),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, POST } from "@/app/api/admin/automation/kill-switch/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/automation/kill-switch", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/automation/kill-switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@invest.com.au" } },
      error: null,
    });
  });

  it("GET denies unauthenticated (401)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("GET denies non-admin (403)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "notadmin@example.com" } },
      error: null,
    });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(403);
  });

  it("GET returns rows", async () => {
    const builder = makeBuilder({ data: [{ feature: "text_moderation", disabled: false }], error: null });
    mockFrom.mockReturnValue(builder);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("rows");
  });

  it("POST denies unauthenticated (401)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("POST", { feature: "text_moderation", disabled: true }));
    expect(res.status).toBe(401);
  });

  it("POST denies non-admin (403)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "notadmin@example.com" } },
      error: null,
    });
    const res = await POST(makeReq("POST", { feature: "text_moderation", disabled: true }));
    expect(res.status).toBe(403);
  });

  it("POST returns 400 for missing feature", async () => {
    const res = await POST(makeReq("POST", {}));
    expect(res.status).toBe(400);
  });

  it("POST flips kill switch", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder1 = makeBuilder({ data: null, error: null });
    const insertBuilder2 = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(upsertBuilder)
      .mockReturnValueOnce(insertBuilder1)
      .mockReturnValueOnce(insertBuilder2);

    const res = await POST(makeReq("POST", { feature: "text_moderation", disabled: true, reason: "Test disable" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
