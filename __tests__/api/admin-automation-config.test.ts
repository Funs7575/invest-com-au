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

import { GET, POST } from "@/app/api/admin/automation/config/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/automation/config", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/automation/config", () => {
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
    const builder = makeBuilder({ data: [{ id: 1, classifier: "text_mod", threshold_name: "spam", value: 0.8 }], error: null });
    mockFrom.mockReturnValue(builder);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("rows");
  });

  it("POST denies unauthenticated (401)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("POST", { classifier: "text_mod", thresholdName: "spam", value: 0.8 }));
    expect(res.status).toBe(401);
  });

  it("POST denies non-admin (403)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "notadmin@example.com" } },
      error: null,
    });
    const res = await POST(makeReq("POST", { classifier: "text_mod", thresholdName: "spam", value: 0.8 }));
    expect(res.status).toBe(403);
  });

  it("POST returns 400 for missing fields", async () => {
    const res = await POST(makeReq("POST", { classifier: "text_mod" }));
    expect(res.status).toBe(400);
  });

  it("POST upserts config", async () => {
    const maybeSingleBuilder = makeBuilder({ data: null, error: null }); // no existing row
    maybeSingleBuilder.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const upsertBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(maybeSingleBuilder) // select existing
      .mockReturnValueOnce(upsertBuilder) // upsert
      .mockReturnValueOnce(insertBuilder); // audit log

    const res = await POST(makeReq("POST", { classifier: "text_mod", thresholdName: "spam", value: 0.75 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
