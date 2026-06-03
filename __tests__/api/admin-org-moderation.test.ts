/**
 * Tests for PATCH /api/admin/org-moderation
 *
 * Auth pattern: createClient + auth.getUser() + getAdminEmails(), with the
 * body parsed via Zod safeParse (real schema). All external IO mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetAdminEmails = vi.fn(() => ["admin@invest.com.au"]);
const mockInviteUserByEmail = vi.fn();
const mockListUsers = vi.fn();

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
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      admin: {
        inviteUserByEmail: (...args: unknown[]) => mockInviteUserByEmail(...args),
        listUsers: () => mockListUsers(),
      },
    },
  })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => mockGetAdminEmails(),
  ADMIN_EMAILS: ["admin@invest.com.au"],
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { PATCH } from "@/app/api/admin/org-moderation/route";

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/org-moderation", {
    method: "PATCH",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

const pendingApp = {
  id: 5,
  organisation_name: "Acme Training",
  organisation_type: "training_provider",
  abn: null,
  website: "https://acme.example.com",
  contact_name: "Jane Doe",
  contact_email: "jane@acme.com",
  contact_phone: null,
  bio: null,
  cpd_provider_number: null,
  status: "pending",
};

describe("PATCH /api/admin/org-moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://invest.com.au");
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "admin@invest.com.au" } } });
    mockGetAdminEmails.mockReturnValue(["admin@invest.com.au"]);
    mockFrom.mockReturnValue(makeBuilder({ data: pendingApp, error: null }));
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(makeReq({ applicationId: 5, action: "reject" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user email is not an admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u2", email: "notadmin@example.com" } } });
    const res = await PATCH(makeReq({ applicationId: 5, action: "reject" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid body (bad action)", async () => {
    const res = await PATCH(makeReq({ applicationId: 5, action: "delete" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the application does not exist", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await PATCH(makeReq({ applicationId: 5, action: "reject" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when the application is already processed", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: { ...pendingApp, status: "approved" }, error: null }));
    const res = await PATCH(makeReq({ applicationId: 5, action: "approve" }));
    expect(res.status).toBe(409);
  });

  it("rejects a pending application and returns action=rejected", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: pendingApp, error: null })); // fetch
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null })); // update
    const res = await PATCH(makeReq({ applicationId: 5, action: "reject", rejection_reason: "spam" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, action: "rejected" });
  });

  it("returns 500 when the invite fails with an unexpected error", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: pendingApp, error: null }));
    mockInviteUserByEmail.mockResolvedValue({ data: null, error: { message: "smtp down" } });
    const res = await PATCH(makeReq({ applicationId: 5, action: "approve" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to invite/i);
  });

  it("returns 500 when the org insert fails", async () => {
    mockInviteUserByEmail.mockResolvedValue({ data: { user: { id: "new-user" } }, error: null });
    let call = 0;
    mockFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder({ data: pendingApp, error: null }); // fetch app
      return makeBuilder({ data: null, error: { message: "duplicate slug" } }); // insert org
    });
    const res = await PATCH(makeReq({ applicationId: 5, action: "approve" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("duplicate slug");
  });

  it("returns 500 when the admin user cannot be resolved", async () => {
    mockInviteUserByEmail.mockResolvedValue({
      data: null,
      error: { message: "A user with this email address has already been registered" },
    });
    mockListUsers.mockResolvedValue({ data: { users: [] } });
    mockFrom.mockReturnValue(makeBuilder({ data: pendingApp, error: null }));
    const res = await PATCH(makeReq({ applicationId: 5, action: "approve" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/could not resolve/i);
  });

  it("approves a pending application and returns the new org", async () => {
    mockInviteUserByEmail.mockResolvedValue({ data: { user: { id: "new-user" } }, error: null });
    let call = 0;
    mockFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder({ data: pendingApp, error: null }); // fetch app
      if (call === 2) return makeBuilder({ data: { id: 99, slug: "acme-training-5" }, error: null }); // insert org
      return makeBuilder({ data: null, error: null }); // update app status
    });
    const res = await PATCH(makeReq({ applicationId: 5, action: "approve" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, action: "approved" });
    expect(json.org).toMatchObject({ id: 99, slug: "acme-training-5" });
  });

  it("approves using an existing user resolved via listUsers", async () => {
    mockInviteUserByEmail.mockResolvedValue({
      data: null,
      error: { message: "A user with this email address has already been registered" },
    });
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: "existing-user", email: "JANE@acme.com" }] },
    });
    let call = 0;
    mockFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder({ data: pendingApp, error: null });
      if (call === 2) return makeBuilder({ data: { id: 99, slug: "acme-training-5" }, error: null });
      return makeBuilder({ data: null, error: null });
    });
    const res = await PATCH(makeReq({ applicationId: 5, action: "approve" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe("approved");
  });
});
