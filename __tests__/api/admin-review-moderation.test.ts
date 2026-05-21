import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// This route uses createClient (server) for auth, not requireAdmin
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte",
    "in","is","not","or","order","limit","range","single","maybeSingle","filter",
    "update",
  ]) b[m] = vi.fn(() => b);
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: () => ["admin@invest.com.au"],
}));

import { PATCH } from "@/app/api/admin/review-moderation/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/review-moderation", {
    method: "PATCH",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

const adminUser = { id: "u1", email: "admin@invest.com.au" };

describe("PATCH /api/admin/review-moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: adminUser }, error: null });
    mockFrom.mockReturnValue(makeBuilder({ error: null }));
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await PATCH(makeReq({ ids: [1], action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when not admin email", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u2", email: "user@example.com" } },
      error: null,
    });
    const res = await PATCH(makeReq({ ids: [1], action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body (empty ids)", async () => {
    const res = await PATCH(makeReq({ ids: [], action: "approve" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid action", async () => {
    const res = await PATCH(makeReq({ ids: [1], action: "delete" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 for reject action", async () => {
    const res = await PATCH(makeReq({ ids: [1, 2], action: "reject" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 200 for flag action", async () => {
    const res = await PATCH(makeReq({ ids: [1], action: "flag" }));
    expect(res.status).toBe(200);
  });

  it("returns 200 for approve action", async () => {
    // approve also queries professional_reviews to recalculate rating
    mockFrom
      .mockReturnValueOnce(makeBuilder({ error: null })) // update status
      .mockReturnValueOnce(makeBuilder({ data: [{ professional_id: 10 }], error: null })) // select professional_id
      .mockReturnValueOnce(makeBuilder({ data: [{ rating: 5 }], error: null })) // select ratings
      .mockReturnValue(makeBuilder({ error: null })); // update avg + audit log
    const res = await PATCH(makeReq({ ids: [1], action: "approve" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
