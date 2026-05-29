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
const mockInviteUserByEmail = vi.fn(
  async (..._a: unknown[]): Promise<{ data: { user: { id: string } | null } | null; error: { message: string } | null }> => ({
    data: { user: { id: "invited-user-id" } },
    error: null,
  }),
);
const mockListUsers = vi.fn(
  async (..._a: unknown[]): Promise<{ data: { users: Array<{ id: string; email?: string }> } | null }> => ({
    data: { users: [] },
  }),
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      admin: {
        inviteUserByEmail: mockInviteUserByEmail,
        listUsers: mockListUsers,
      },
    },
  })),
}));

import { PATCH } from "@/app/api/admin/org-moderation/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/org-moderation", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const pendingApp = {
  id: 1,
  status: "pending",
  organisation_name: "Test Org",
  organisation_type: "fintech",
  abn: "12345678901",
  website: "https://testorg.com",
  contact_name: "Jane Smith",
  contact_email: "jane@testorg.com",
  contact_phone: null,
  bio: "A fintech org",
  cpd_provider_number: null,
};

describe("PATCH /api/admin/org-moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@invest.com.au" } },
      error: null,
    });
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder());
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await PATCH(makeReq({ applicationId: 1, action: "reject" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when auth.getUser returns error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "JWT expired" } });
    const res = await PATCH(makeReq({ applicationId: 1, action: "reject" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user email is not in admin list", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u2", email: "hacker@evil.com" } },
      error: null,
    });
    const res = await PATCH(makeReq({ applicationId: 1, action: "reject" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/forbidden/i);
  });

  it("returns 400 when applicationId is missing", async () => {
    const res = await PATCH(makeReq({ action: "reject" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is invalid", async () => {
    const res = await PATCH(makeReq({ applicationId: 1, action: "delete" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when applicationId is not a positive int", async () => {
    const res = await PATCH(makeReq({ applicationId: -1, action: "approve" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when application is not found", async () => {
    // maybeSingle returns null data
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await PATCH(makeReq({ applicationId: 999, action: "reject" }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it("returns 409 when application is already processed", async () => {
    const approvedApp = { ...pendingApp, status: "approved" };
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(approvedApp, null));
    const res = await PATCH(makeReq({ applicationId: 1, action: "reject" }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/already processed/i);
  });

  it("rejects an application and returns success", async () => {
    const lookupBuilder = makeBuilder(pendingApp, null);
    const updateBuilder = makeBuilder(null, null);
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return lookupBuilder;
      return updateBuilder;
    });

    const res = await PATCH(makeReq({ applicationId: 1, action: "reject", rejection_reason: "Not eligible" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.action).toBe("rejected");
  });

  it("rejects with no rejection_reason when omitted", async () => {
    const lookupBuilder = makeBuilder(pendingApp, null);
    const updateBuilder = makeBuilder(null, null);
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return lookupBuilder;
      return updateBuilder;
    });

    const res = await PATCH(makeReq({ applicationId: 1, action: "reject" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe("rejected");
  });

  it("approves an application, invites user and creates org", async () => {
    const lookupBuilder = makeBuilder(pendingApp, null);
    const orgBuilder = makeBuilder({ id: 42, slug: "test-org-1" }, null);
    const updateBuilder = makeBuilder(null, null);
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return lookupBuilder;
      if (callCount === 2) return orgBuilder;
      return updateBuilder;
    });
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "invited-user-id" } },
      error: null,
    });

    const res = await PATCH(makeReq({ applicationId: 1, action: "approve" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.action).toBe("approved");
    expect(json.org).toEqual({ id: 42, slug: "test-org-1" });
  });

  it("approves and falls back to listUsers when user already registered", async () => {
    const lookupBuilder = makeBuilder(pendingApp, null);
    const orgBuilder = makeBuilder({ id: 43, slug: "test-org-1" }, null);
    const updateBuilder = makeBuilder(null, null);
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return lookupBuilder;
      if (callCount === 2) return orgBuilder;
      return updateBuilder;
    });
    mockInviteUserByEmail.mockResolvedValue({
      data: null,
      error: { message: "A user with this email address has already been registered" },
    });
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: "existing-user-id", email: "jane@testorg.com" }] },
    });

    const res = await PATCH(makeReq({ applicationId: 1, action: "approve" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe("approved");
  });

  it("returns 500 when invite fails with unexpected error", async () => {
    const lookupBuilder = makeBuilder(pendingApp, null);
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return lookupBuilder;
      return makeBuilder(null, null);
    });
    mockInviteUserByEmail.mockResolvedValue({
      data: null,
      error: { message: "SMTP connection refused" },
    });

    const res = await PATCH(makeReq({ applicationId: 1, action: "approve" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to invite/i);
  });

  it("returns 500 when org insert fails", async () => {
    const lookupBuilder = makeBuilder(pendingApp, null);
    const orgBuilder = makeBuilder(null, { message: "unique violation" });
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return lookupBuilder;
      return orgBuilder;
    });
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "invited-user-id" } },
      error: null,
    });

    const res = await PATCH(makeReq({ applicationId: 1, action: "approve" }));
    expect(res.status).toBe(500);
  });
});
