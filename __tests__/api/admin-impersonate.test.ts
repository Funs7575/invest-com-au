/**
 * Tests for POST /api/admin/impersonate
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "1.2.3.4"),
}));

const mockGetUserById = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  data: { user: { id: "target-user-1", email: "user@example.com" } },
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "delete", "eq", "single"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { getUserById: (...args: unknown[]) => mockGetUserById(...args) } },
  })),
}));

const mockStartImpersonation = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  id: 7,
  target_email: "user@example.com",
}));
vi.mock("@/lib/admin-impersonation", () => ({
  buildImpersonateCookieAttrs: vi.fn((id: number) => `iv_impersonate=${id}; Path=/; HttpOnly; SameSite=Lax`),
  startImpersonation: (...args: unknown[]) => mockStartImpersonation(...args),
}));

import { POST } from "@/app/api/admin/impersonate/route";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/impersonate", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4", "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe("POST /api/admin/impersonate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true, email: "admin@invest.com.au", userId: "u1",
    });
    mockIsAllowed.mockResolvedValue(true);
    mockGetUserById.mockResolvedValue({
      data: { user: { id: VALID_UUID, email: "user@example.com" } },
    });
    mockStartImpersonation.mockResolvedValue({ id: 7, target_email: "user@example.com" });
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq({ target_user_id: VALID_UUID }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ target_user_id: VALID_UUID }));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/admin/impersonate", {
      method: "POST",
      body: "bad-json",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when target_user_id is not a UUID", async () => {
    const res = await POST(makeReq({ target_user_id: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when target user not found", async () => {
    mockGetUserById.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq({ target_user_id: VALID_UUID }));
    expect(res.status).toBe(404);
  });

  it("returns 200 with impersonation_id and sets cookie on success", async () => {
    const res = await POST(makeReq({ target_user_id: VALID_UUID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.impersonation_id).toBe(7);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("iv_impersonate=7");
  });

  it("returns 500 when startImpersonation throws", async () => {
    mockStartImpersonation.mockRejectedValue(new Error("db error"));
    const res = await POST(makeReq({ target_user_id: VALID_UUID }));
    expect(res.status).toBe(500);
  });
});
