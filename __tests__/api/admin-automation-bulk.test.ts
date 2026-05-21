import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));

function makeBuilder(result: unknown = { data: null, error: null, count: 1 }) {
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

import { POST } from "@/app/api/admin/automation/bulk/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/automation/bulk", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/automation/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@invest.com.au" } },
      error: null,
    });
  });

  it("POST denies unauthenticated user (401)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq({ feature: "listing_scam", targetVerdict: "active", rowIds: [1] }));
    expect(res.status).toBe(401);
  });

  it("POST denies non-admin email (403)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "notadmin@example.com" } },
      error: null,
    });
    const res = await POST(makeReq({ feature: "listing_scam", targetVerdict: "active", rowIds: [1] }));
    expect(res.status).toBe(403);
  });

  it("POST returns 400 for missing feature/targetVerdict/rowIds", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for disallowed feature", async () => {
    const res = await POST(makeReq({ feature: "lead_disputes", targetVerdict: "approved", rowIds: [1] }));
    expect(res.status).toBe(400);
  });

  it("POST bulk updates listing_scam", async () => {
    const updateBuilder = makeBuilder({ data: null, error: null, count: 1 });
    const insertBuilder1 = makeBuilder({ data: null, error: null });
    const insertBuilder2 = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(updateBuilder)
      .mockReturnValueOnce(insertBuilder1)
      .mockReturnValueOnce(insertBuilder2);

    const res = await POST(makeReq({ feature: "listing_scam", targetVerdict: "active", rowIds: [1, 2] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok");
  });
});
