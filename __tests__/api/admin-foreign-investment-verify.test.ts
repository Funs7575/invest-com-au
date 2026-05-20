/**
 * Tests for POST /api/admin/foreign-investment/verify
 *
 * Same custom auth pattern as /update: createClient + getAdminEmails.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetAdminEmails = vi.fn(() => ["admin@invest.com.au"]);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: () => mockGetUser() },
  })),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not",
    "or", "order", "limit", "range", "single", "maybeSingle", "filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => mockGetAdminEmails(),
  ADMIN_EMAILS: ["admin@invest.com.au"],
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  })),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

import { POST } from "@/app/api/admin/foreign-investment/verify/route";

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/foreign-investment/verify", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

describe("POST /api/admin/foreign-investment/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@invest.com.au" } },
    });
    mockGetAdminEmails.mockReturnValue(["admin@invest.com.au"]);
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
  });

  it("returns 401 when user not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq({ categoryKey: "tax-brackets" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user not in admin list", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u2", email: "notadmin@example.com" } },
    });
    const res = await POST(makeReq({ categoryKey: "tax-brackets" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/admin/foreign-investment/verify", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when categoryKey is missing", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("categoryKey");
  });

  it("returns 200 on valid request", async () => {
    const res = await POST(makeReq({ categoryKey: "tax-brackets", note: "looks good" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.categoryKey).toBe("tax-brackets");
  });
});
