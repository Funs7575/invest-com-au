/**
 * Tests for PATCH /api/admin/org-verify
 *
 * Auth pattern: createClient + auth.getUser() + getAdminEmails(), body parsed
 * via Zod safeParse (real schema). All external IO mocked.
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
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { PATCH } from "@/app/api/admin/org-verify/route";

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/org-verify", {
    method: "PATCH",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

const orgRow = { id: 12, name: "Acme Training", verification_status: "pending" };

describe("PATCH /api/admin/org-verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "admin@invest.com.au" } } });
    mockGetAdminEmails.mockReturnValue(["admin@invest.com.au"]);
    mockFrom.mockReturnValue(makeBuilder({ data: orgRow, error: null }));
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(makeReq({ organisationId: 12, action: "verify" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user email is not an admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u2", email: "nope@example.com" } } });
    const res = await PATCH(makeReq({ organisationId: 12, action: "verify" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid body (bad action)", async () => {
    const res = await PATCH(makeReq({ organisationId: 12, action: "approve" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-positive organisationId", async () => {
    const res = await PATCH(makeReq({ organisationId: -1, action: "verify" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the organisation does not exist", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await PATCH(makeReq({ organisationId: 12, action: "verify" }));
    expect(res.status).toBe(404);
  });

  it("returns 500 when the update query fails", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: orgRow, error: null })); // fetch org
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: "update failed" } })); // update
    const res = await PATCH(makeReq({ organisationId: 12, action: "verify" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("update failed");
  });

  it("verifies an organisation and returns verified status", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: orgRow, error: null })); // fetch
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null })); // update
    const res = await PATCH(makeReq({ organisationId: 12, action: "verify" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, verification_status: "verified" });
  });

  it("unverifies an organisation and returns unverified status", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: orgRow, error: null })); // fetch
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null })); // update
    const res = await PATCH(makeReq({ organisationId: 12, action: "unverify" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.verification_status).toBe("unverified");
  });
});
