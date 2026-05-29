import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));

const mockGetUser = vi.fn(
  async (): Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }> => ({
    data: { user: { id: "u1", email: "admin@invest.com.au" } },
    error: null,
  }),
);

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { PATCH } from "@/app/api/admin/org-verify/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/org-verify", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const existingOrg = { id: 10, name: "Test Org", verification_status: "pending" };

describe("PATCH /api/admin/org-verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@invest.com.au" } },
      error: null,
    });
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(existingOrg, null));
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await PATCH(makeReq({ organisationId: 10, action: "verify" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when auth returns an error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "session expired" } });
    const res = await PATCH(makeReq({ organisationId: 10, action: "verify" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user email is not admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u3", email: "stranger@example.com" } },
      error: null,
    });
    const res = await PATCH(makeReq({ organisationId: 10, action: "verify" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/forbidden/i);
  });

  it("returns 400 when organisationId is missing", async () => {
    const res = await PATCH(makeReq({ action: "verify" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is invalid", async () => {
    const res = await PATCH(makeReq({ organisationId: 10, action: "delete" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when organisationId is not a positive int", async () => {
    const res = await PATCH(makeReq({ organisationId: -5, action: "verify" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when organisation does not exist", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await PATCH(makeReq({ organisationId: 999, action: "verify" }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it("verifies an organisation and returns new verification_status", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return makeBuilder(existingOrg, null);
      return makeBuilder(null, null); // update success
    });
    const res = await PATCH(makeReq({ organisationId: 10, action: "verify" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.verification_status).toBe("verified");
  });

  it("unverifies an organisation and returns new verification_status", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return makeBuilder(existingOrg, null);
      return makeBuilder(null, null);
    });
    const res = await PATCH(makeReq({ organisationId: 10, action: "unverify" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.verification_status).toBe("unverified");
  });

  it("returns 500 when the update query fails", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return makeBuilder(existingOrg, null);
      return makeBuilder(null, { message: "foreign key violation" });
    });
    const res = await PATCH(makeReq({ organisationId: 10, action: "verify" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("foreign key violation");
  });
});
